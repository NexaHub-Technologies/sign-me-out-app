import type { KonvaEventObject } from "konva/lib/Node";
import { useEffect, useState } from "react";
import {
	Circle,
	Group,
	Image as KonvaImage,
	Line,
	Rect,
	Text,
} from "react-konva";

import { strokeToFlatPath } from "#/features/canvas/stroke.ts";
import type { Mark } from "#/features/canvas/types.ts";

const HAND_FONT = "Caveat, Comic Sans MS, cursive";

const WAVEFORM = [10, 16, 8, 18, 12, 14, 9].map((h, i) => ({
	id: `bar-${i}`,
	i,
	h,
}));

function useImage(url: string | null | undefined) {
	const [img, setImg] = useState<HTMLImageElement | null>(null);
	useEffect(() => {
		if (!url) return;
		const image = new window.Image();
		image.crossOrigin = "anonymous";
		image.src = url;
		const onLoad = () => setImg(image);
		image.addEventListener("load", onLoad);
		return () => image.removeEventListener("load", onLoad);
	}, [url]);
	return img;
}

export function RenderMark({
	mark,
	draggable,
	onDragEnd,
}: {
	mark: Mark;
	draggable?: boolean;
	onDragEnd?: (id: string, x: number, y: number) => void;
}) {
	const common = {
		id: mark.id,
		name: "mark",
		x: mark.x,
		y: mark.y,
		rotation: mark.rotation ?? 0,
		scaleX: mark.scale ?? 1,
		scaleY: mark.scale ?? 1,
		draggable,
		onDragEnd: (e: KonvaEventObject<DragEvent>) =>
			onDragEnd?.(mark.id, e.target.x(), e.target.y()),
	};

	switch (mark.kind) {
		case "stroke":
			return (
				<Line
					{...common}
					points={strokeToFlatPath(mark.points ?? [], mark.size ?? 8)}
					closed
					fill={mark.color ?? "#1b1b19"}
					lineCap="round"
					lineJoin="round"
				/>
			);
		case "text":
			return (
				<Text
					{...common}
					text={mark.text ?? ""}
					fontSize={mark.fontSize ?? 28}
					fontFamily={HAND_FONT}
					fontStyle="600"
					fill={mark.color ?? "#1b1b19"}
					width={mark.width ?? undefined}
					lineHeight={1.1}
				/>
			);
		case "photo":
			return <PhotoMark mark={mark} common={common} />;
		case "voice":
			return <VoiceMark mark={mark} common={common} />;
		default:
			return null;
	}
}

type CommonProps = {
	id: string;
	name: string;
	x: number;
	y: number;
	rotation: number;
	scaleX: number;
	scaleY: number;
	draggable?: boolean;
	onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
};

function PhotoMark({ mark, common }: { mark: Mark; common: CommonProps }) {
	const img = useImage(mark.mediaUrl);
	const w = mark.width ?? 220;
	const h = mark.height ?? 160;
	return (
		<Group {...common}>
			{/* polaroid frame */}
			<Rect
				width={w + 12}
				height={h + (mark.caption ? 44 : 12)}
				x={-6}
				y={-6}
				fill="#ffffff"
				cornerRadius={6}
				shadowColor="rgba(27,27,25,0.25)"
				shadowBlur={12}
				shadowOffsetY={4}
			/>
			{img ? (
				<KonvaImage image={img} width={w} height={h} cornerRadius={3} />
			) : (
				<Rect width={w} height={h} fill="#f2efe6" cornerRadius={3} />
			)}
			{mark.caption && (
				<Text
					text={mark.caption}
					x={0}
					y={h + 6}
					width={w}
					align="center"
					fontSize={20}
					fontFamily={HAND_FONT}
					fill="#56544c"
				/>
			)}
		</Group>
	);
}

function VoiceMark({ mark, common }: { mark: Mark; common: CommonProps }) {
	const seconds = Math.round((mark.durationMs ?? 0) / 1000);
	const label = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
	const color = mark.color ?? "#15784a";

	function play() {
		if (!mark.mediaUrl) return;
		new window.Audio(mark.mediaUrl).play().catch(() => {});
	}

	return (
		<Group {...common} onClick={play} onTap={play}>
			<Rect
				width={150}
				height={44}
				cornerRadius={22}
				fill="#ffffff"
				stroke="rgba(27,27,25,0.12)"
				strokeWidth={1}
				shadowColor="rgba(27,27,25,0.2)"
				shadowBlur={10}
				shadowOffsetY={3}
			/>
			<Circle x={22} y={22} radius={13} fill={color} />
			{/* simple mic glyph */}
			<Rect x={18} y={14} width={8} height={12} cornerRadius={4} fill="#fff" />
			<Rect x={21} y={28} width={2} height={4} fill="#fff" />
			{/* fake waveform */}
			{WAVEFORM.map((bar) => (
				<Rect
					key={bar.id}
					x={46 + bar.i * 8}
					y={22 - bar.h / 2}
					width={3}
					height={bar.h}
					cornerRadius={1.5}
					fill={color}
					opacity={0.8}
				/>
			))}
			<Text
				text={label}
				x={108}
				y={15}
				fontSize={13}
				fontStyle="600"
				fontFamily="Manrope, sans-serif"
				fill="#56544c"
			/>
		</Group>
	);
}
