import { jsPDF } from "jspdf";
import type Konva from "konva";

type ExportFormat = "png" | "jpg" | "svg" | "pdf";

function hideVoiceMarks(stage: Konva.Stage) {
	const voices = stage.find(".voice-mark");
	for (const v of voices) v.hide();
	return () => {
		for (const v of voices) v.show();
	};
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
) {
	const restore = hideVoiceMarks(stage);
	try {
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
	} finally {
		restore();
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
