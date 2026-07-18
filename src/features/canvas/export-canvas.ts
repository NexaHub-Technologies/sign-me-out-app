import { jsPDF } from "jspdf";
import Konva from "konva";

type ExportFormat = "png" | "jpg" | "svg" | "pdf";

type ExportOptions = {
	// Fill the exported image with the board colour instead of leaving it
	// transparent. Used for JPG/PDF (whose backgrounds would otherwise be black).
	backgroundColor?: string;
};

// Breathing room (in world units) around the content when exporting.
const EXPORT_PADDING = 48;

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
 * Temporarily reframe the stage so its canvas covers the entire content
 * bounding box (not just the current viewport), run `render`, then restore the
 * live pan/zoom. This is what lets an export include marks scrolled off-screen.
 */
function withFullContentView<T>(
	stage: Konva.Stage,
	render: () => T,
	backgroundColor?: string,
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

	const x = box.x - EXPORT_PADDING;
	const y = box.y - EXPORT_PADDING;
	const width = box.width + EXPORT_PADDING * 2;
	const height = box.height + EXPORT_PADDING * 2;

	// Optional board-colour backdrop, sized to the export box and dropped behind
	// every mark. Destroyed in the finally so the live board stays transparent.
	let background: Konva.Rect | null = null;
	if (backgroundColor) {
		background = new Konva.Rect({
			x,
			y,
			width,
			height,
			fill: backgroundColor,
			listening: false,
		});
		layer.add(background);
		background.moveToBottom();
	}

	// Grow the stage canvas to the full box and shift content into view.
	stage.width(width);
	stage.height(height);
	stage.position({ x: -x, y: -y });
	stage.draw();

	try {
		return render();
	} finally {
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
	const backgroundColor =
		format === "jpg" || format === "pdf" ? options.backgroundColor : undefined;

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
			backgroundColor,
		);
	} finally {
		restoreTransformers();
		restoreVoice();
	}
}

/**
 * Render the board's full content to a PNG data URL without downloading
 * anything — used to texture the 3D product mockups. Shares the same
 * hide-voice/hide-transformer/full-content-view pipeline as the download
 * export, just returns the data URL instead of triggering a save.
 */
export function captureBoardPNG(
	stage: Konva.Stage,
	backgroundColor?: string,
): string | null {
	const restoreVoice = hideVoiceMarks(stage);
	const restoreTransformers = hideTransformers(stage);
	try {
		return withFullContentView(
			stage,
			() => stage.toDataURL({ pixelRatio: 2, mimeType: "image/png" }),
			backgroundColor,
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
