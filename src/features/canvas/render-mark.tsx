import type { KonvaEventObject } from "konva/lib/Node";
import { useEffect, useRef, useState } from "react";
import {
	Arc,
	Circle,
	Group,
	Image as KonvaImage,
	Line,
	Rect,
	Text,
} from "react-konva";

import { strokeToFlatPath } from "#/features/canvas/stroke.ts";
import type { Mark } from "#/features/canvas/types.ts";
import { getVoiceUrl } from "#/server/marks.ts";

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

export type TransformPatch = {
	x: number;
	y: number;
	rotation: number;
	scale: number;
};

export function RenderMark({
	mark,
	draggable,
	onDragEnd,
	onSelect,
	onTransformEnd,
	viewerId,
	isHost,
}: {
	mark: Mark;
	draggable?: boolean;
	onDragEnd?: (id: string, x: number, y: number) => void;
	onSelect?: (id: string) => void;
	onTransformEnd?: (id: string, patch: TransformPatch) => void;
	viewerId?: string | null;
	isHost?: boolean;
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
		onClick: () => onSelect?.(mark.id),
		onTap: () => onSelect?.(mark.id),
		onTransformEnd: (e: KonvaEventObject<Event>) => {
			const n = e.target;
			onTransformEnd?.(mark.id, {
				x: n.x(),
				y: n.y(),
				rotation: n.rotation(),
				scale: n.scaleX(),
			});
		},
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
			return (
				<VoiceMark
					mark={mark}
					common={common}
					// Only the host or the recording's author may listen.
					canListen={
						!!isHost || (mark.authorId != null && mark.authorId === viewerId)
					}
				/>
			);
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
	onClick: () => void;
	onTap: () => void;
	onTransformEnd: (e: KonvaEventObject<Event>) => void;
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

function VoiceMark({
	mark,
	common,
	canListen,
}: {
	mark: Mark;
	common: CommonProps;
	canListen: boolean;
}) {
	const seconds = Math.round((mark.durationMs ?? 0) / 1000);
	const label = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
	const color = mark.color ?? "#15784a";
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [playing, setPlaying] = useState(false);

	// Stop playback if the chip unmounts.
	useEffect(() => {
		return () => audioRef.current?.pause();
	}, []);

	async function toggle(e: KonvaEventObject<Event>) {
		e.cancelBubble = true; // play/pause only — don't also select the chip
		if (!canListen || !mark.mediaUrl) return; // host & author only
		let audio = audioRef.current;
		if (!audio) {
			// Voice files are private; the server mints a signed URL after
			// re-checking that we're the host or the author.
			let url: string;
			try {
				const res = await getVoiceUrl({ data: { markId: mark.id } });
				url = res.url;
			} catch {
				return;
			}
			audio = new window.Audio(url);
			audio.addEventListener("play", () => setPlaying(true));
			audio.addEventListener("pause", () => setPlaying(false));
			audio.addEventListener("ended", () => setPlaying(false));
			audioRef.current = audio;
		}
		if (audio.paused) audio.play().catch(() => {});
		else audio.pause();
	}

	return (
		<Group {...common}>
			{/* author's name, above the recording */}
			<Text
				text={mark.authorName}
				x={0}
				y={-18}
				width={150}
				align="center"
				fontSize={12}
				fontStyle="600"
				fontFamily="Manrope, sans-serif"
				fill="#56544c"
				listening={false}
			/>
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
			{/* play / pause / locked button */}
			<Group onClick={toggle} onTap={toggle}>
				<Circle
					x={22}
					y={22}
					radius={13}
					fill={color}
					opacity={canListen ? 1 : 0.55}
				/>
				{!canListen ? (
					// padlock: shackle (half ring) + body
					<>
						<Arc
							x={22}
							y={21}
							innerRadius={2.5}
							outerRadius={4}
							angle={180}
							rotation={180}
							fill="#fff"
						/>
						<Rect
							x={18}
							y={21}
							width={8}
							height={7}
							cornerRadius={1.5}
							fill="#fff"
						/>
					</>
				) : playing ? (
					<>
						<Rect
							x={18}
							y={15}
							width={3}
							height={14}
							cornerRadius={1}
							fill="#fff"
						/>
						<Rect
							x={25}
							y={15}
							width={3}
							height={14}
							cornerRadius={1}
							fill="#fff"
						/>
					</>
				) : (
					<Line points={[19, 15, 19, 29, 30, 22]} closed fill="#fff" />
				)}
			</Group>
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
					opacity={playing ? 1 : canListen ? 0.8 : 0.4}
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
