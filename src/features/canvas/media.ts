import { getSupabaseBrowserClient } from "#/lib/supabase.ts";

const BUCKET = "space-media";

/** Upload a photo/audio blob (authenticated) and return its public URL. */
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

/** Natural dimensions of an image url. */
export function loadImageDims(url: string): Promise<{ w: number; h: number }> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
		img.onerror = reject;
		img.src = url;
	});
}
