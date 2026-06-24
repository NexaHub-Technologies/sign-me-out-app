import { getSupabaseBrowserClient } from "#/lib/supabase.ts";

const BUCKET = "space-media";
const VOICE_BUCKET = "space-voice";

/** Upload a photo blob (authenticated) and return its public URL. */
export async function uploadMedia(
	spaceId: string,
	markId: string,
	file: Blob,
	ext: string,
	contentType: string,
): Promise<string> {
	const sb = getSupabaseBrowserClient();
	const path = `${spaceId}/${markId}.${ext}`;
	// upsert:false → plain INSERT. The path is unique per mark id, so there's
	// never a conflict; upsert:true would issue ON CONFLICT DO UPDATE, which
	// requires a storage UPDATE policy and fails RLS for signers.
	const { error } = await sb.storage
		.from(BUCKET)
		.upload(path, file, { contentType, upsert: false });
	if (error) throw error;
	return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Upload a voice note to the private bucket (authenticated) and return its
 * storage *path* — not a URL. Listening is gated server-side, which mints a
 * signed URL only for the host or the author (see server getVoiceUrl).
 */
export async function uploadVoice(
	spaceId: string,
	markId: string,
	file: Blob,
): Promise<string> {
	const sb = getSupabaseBrowserClient();
	const path = `${spaceId}/${markId}.webm`;
	const { error } = await sb.storage
		.from(VOICE_BUCKET)
		.upload(path, file, { contentType: "audio/webm", upsert: false });
	if (error) throw error;
	return path;
}

/** Natural dimensions of an image url. */
export function loadImageDims(url: string): Promise<{ w: number; h: number }> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
		img.onerror = reject;
		img.src = url;
	});
}
