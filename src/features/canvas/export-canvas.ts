import { jsPDF } from "jspdf";
import Konva from "konva";

import { NEXAHUB_MARK_BOX, NEXAHUB_MARK_PATH } from "#/lib/nexahub-mark.ts";

type ExportFormat = "png" | "jpg" | "svg" | "pdf";

type ExportOptions = {
	// The board colour. Painted behind the marks for JPG/PDF (whose backgrounds
	// would otherwise be black); PNG/SVG stay transparent. Either way it decides
	// whether the watermark is inked dark or light.
	backgroundColor?: string;
};

// Breathing room (in world units) around the content when exporting.
const EXPORT_PADDING = 48;

// Watermark sizing, in world units: the glyph is a fraction of the board's
// longest side so it stays proportional on both a tiny board and a huge one,
// clamped so it never disappears or dominates.
const WATERMARK_SCALE = 0.022;
const WATERMARK_MIN_SIZE = 18;
const WATERMARK_MAX_SIZE = 40;
const WATERMARK_MARGIN = 16;
const WATERMARK_OPACITY = 0.5;
// The mark + wordmark lockup never claims more than this share of the frame's
// width; past it the whole lockup scales down to fit.
const WATERMARK_MAX_WIDTH_RATIO = 0.4;

function hideVoiceMarks(stage: Konva.Stage) {
	const voices = stage.find(".voice-mark");
	for (const v of voices) v.hide();
	return () => {
		for (const v of voices) v.show();
	};
}

// The selection Transformer lives in the content layer; hide it (and its
// handles) so it never bleeds into the export or inflates the content bounds.
function hideTransformers(stage: Konva.Stage) {
	const transformers = stage.find("Transformer");
	const wasVisible = transformers.map((t) => t.visible());
	for (const t of transformers) t.hide();
	return () => {
		transformers.forEach((t, i) => {
			if (wasVisible[i]) t.show();
		});
	};
}

/**
 * Rough perceived brightness of a `#rgb`/`#rrggbb` colour, 0 (black) to 1
 * (white). Anything we can't parse is treated as light, matching the default
 * paper board.
 */
function brightness(color: string | undefined): number {
	if (!color?.startsWith("#")) return 1;
	const hex =
		color.length === 4
			? color
					.slice(1)
					.split("")
					.map((c) => c + c)
					.join("")
			: color.slice(1);
	if (hex.length !== 6) return 1;
	const n = Number.parseInt(hex, 16);
	if (Number.isNaN(n)) return 1;
	const r = (n >> 16) & 255;
	const g = (n >> 8) & 255;
	const b = n & 255;
	return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** Watermark ink: brand purple on light boards, white on dark ones. */
function watermarkInk(boardColor: string | undefined): string {
	return brightness(boardColor) < 0.5 ? "#ffffff" : "#311049";
}

function watermarkSize(contentWidth: number, contentHeight: number): number {
	const raw = Math.max(contentWidth, contentHeight) * WATERMARK_SCALE;
	return Math.min(WATERMARK_MAX_SIZE, Math.max(WATERMARK_MIN_SIZE, raw));
}

/**
 * Drop the NexaHub mark + wordmark into the bottom-right corner of the export
 * frame, right-aligned and sitting on the baseline `bottom`. Shrinks to fit
 * `maxWidth`, so the lockup never overruns a narrow export. Returns a cleanup
 * that removes it — the live board is never watermarked.
 */
function addWatermark(
	layer: Konva.Layer,
	opts: {
		right: number;
		bottom: number;
		size: number;
		ink: string;
		maxWidth: number;
	},
) {
	const { right, bottom, size, ink } = opts;
	const gap = size * 0.38;

	const group = new Konva.Group({
		listening: false,
		opacity: WATERMARK_OPACITY,
	});

	// Konva.Path draws in the path's own coordinate space, so offset by the
	// glyph's origin and scale it down to `size`.
	const glyph = new Konva.Path({
		data: NEXAHUB_MARK_PATH,
		fill: ink,
		offsetX: NEXAHUB_MARK_BOX.x,
		offsetY: NEXAHUB_MARK_BOX.y,
		scaleX: size / NEXAHUB_MARK_BOX.size,
		scaleY: size / NEXAHUB_MARK_BOX.size,
	});

	const label = new Konva.Text({
		text: "NexaHub Technologies",
		fontFamily: "Manrope, sans-serif",
		fontStyle: "bold",
		fontSize: size * 0.56,
		letterSpacing: size * 0.02,
		fill: ink,
		x: size + gap,
		height: size,
		verticalAlign: "middle",
	});

	group.add(glyph, label);

	// Shrink the whole lockup (mark + wordmark together) when the frame is too
	// narrow to hold it at full size — a board with one small mark exports to a
	// thumbnail the watermark would otherwise overrun.
	const lockupWidth = size + gap + label.width();
	const shrink = Math.min(1, opts.maxWidth / lockupWidth);
	group.scale({ x: shrink, y: shrink });
	group.position({
		x: right - lockupWidth * shrink,
		y: bottom - size * shrink,
	});
	layer.add(group);

	return () => group.destroy();
}

/**
 * Temporarily reframe the stage so its canvas covers the entire content
 * bounding box (not just the current viewport), run `render`, then restore the
 * live pan/zoom. This is what lets an export include marks scrolled off-screen.
 */
function withFullContentView<T>(
	stage: Konva.Stage,
	render: () => T,
	opts: { boardColor?: string; paintBackground: boolean },
): T | null {
	const layer = stage.getLayers()[0];
	if (!layer) return null;

	const prev = {
		scale: stage.scale(),
		position: stage.position(),
		width: stage.width(),
		height: stage.height(),
	};

	// Measure the content in world units: with an identity stage transform the
	// layer's absolute client rect is the world-space bounding box of everything.
	stage.scale({ x: 1, y: 1 });
	stage.position({ x: 0, y: 0 });
	const box = layer.getClientRect({ relativeTo: stage });

	// Nothing on the board — bail and let the caller keep the current view.
	if (box.width <= 0 || box.height <= 0) {
		stage.scale(prev.scale);
		stage.position(prev.position);
		return null;
	}

	// The watermark lives in the bottom margin, so grow that margin when the
	// glyph needs more room than the standard padding — it never sits on a mark.
	const brandSize = watermarkSize(box.width, box.height);
	const bottomPadding = Math.max(
		EXPORT_PADDING,
		brandSize + WATERMARK_MARGIN * 1.5,
	);

	const x = box.x - EXPORT_PADDING;
	const y = box.y - EXPORT_PADDING;
	const width = box.width + EXPORT_PADDING * 2;
	const height = box.height + EXPORT_PADDING + bottomPadding;

	// Optional board-colour backdrop, sized to the export box and dropped behind
	// every mark. Destroyed in the finally so the live board stays transparent.
	let background: Konva.Rect | null = null;
	if (opts.paintBackground && opts.boardColor) {
		background = new Konva.Rect({
			x,
			y,
			width,
			height,
			fill: opts.boardColor,
			listening: false,
		});
		layer.add(background);
		background.moveToBottom();
	}

	// Added after the backdrop so it always sits on top of it.
	const removeWatermark = addWatermark(layer, {
		right: x + width - WATERMARK_MARGIN,
		bottom: y + height - WATERMARK_MARGIN,
		size: brandSize,
		ink: watermarkInk(opts.boardColor),
		maxWidth: Math.min(
			width - WATERMARK_MARGIN * 2,
			width * WATERMARK_MAX_WIDTH_RATIO,
		),
	});

	// Grow the stage canvas to the full box and shift content into view.
	stage.width(width);
	stage.height(height);
	stage.position({ x: -x, y: -y });
	stage.draw();

	try {
		return render();
	} finally {
		removeWatermark();
		background?.destroy();
		stage.width(prev.width);
		stage.height(prev.height);
		stage.scale(prev.scale);
		stage.position(prev.position);
		stage.draw();
	}
}

function downloadDataURL(dataURL: string, filename: string) {
	const link = document.createElement("a");
	link.download = filename;
	link.href = dataURL;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

function getFilename(base: string, ext: string) {
	return `${base}.${ext}`;
}

export function exportCanvas(
	stage: Konva.Stage,
	format: ExportFormat,
	baseName: string,
	options: ExportOptions = {},
) {
	// JPG and PDF have no alpha channel, so a transparent canvas renders black —
	// paint the board colour behind them. PNG/SVG keep their transparency.
	const paintBackground = format === "jpg" || format === "pdf";

	const restoreVoice = hideVoiceMarks(stage);
	const restoreTransformers = hideTransformers(stage);
	try {
		withFullContentView(
			stage,
			() => {
				switch (format) {
					case "png":
						exportPNG(stage, baseName);
						break;
					case "jpg":
						exportJPG(stage, baseName);
						break;
					case "svg":
						exportSVG(stage, baseName);
						break;
					case "pdf":
						exportPDF(stage, baseName);
						break;
				}
			},
			{ boardColor: options.backgroundColor, paintBackground },
		);
	} finally {
		restoreTransformers();
		restoreVoice();
	}
}

function exportPNG(stage: Konva.Stage, baseName: string) {
	const dataURL = stage.toDataURL({ pixelRatio: 2, mimeType: "image/png" });
	downloadDataURL(dataURL, getFilename(baseName, "png"));
}

function exportJPG(stage: Konva.Stage, baseName: string) {
	const dataURL = stage.toDataURL({ pixelRatio: 2, mimeType: "image/jpeg" });
	downloadDataURL(dataURL, getFilename(baseName, "jpg"));
}

function exportSVG(stage: Konva.Stage, baseName: string) {
	const dataURL = stage.toDataURL({ mimeType: "image/svg+xml" });
	downloadDataURL(dataURL, getFilename(baseName, "svg"));
}

function exportPDF(stage: Konva.Stage, baseName: string) {
	const dataURL = stage.toDataURL({ pixelRatio: 2, mimeType: "image/png" });
	const img = new Image();
	img.src = dataURL;
	img.onload = () => {
		const pdf = new jsPDF({
			orientation: img.width > img.height ? "landscape" : "portrait",
			unit: "px",
			format: [img.width, img.height],
		});
		pdf.addImage(dataURL, "PNG", 0, 0, img.width, img.height);
		pdf.save(getFilename(baseName, "pdf"));
	};
}
