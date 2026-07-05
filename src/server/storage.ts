import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Private bucket for voice notes — never public; reads go through signed URLs. */
export const VOICE_BUCKET = "space-voice";
/** Bucket for photo uploads (legacy; photos are currently disabled). */
export const MEDIA_BUCKET = "space-media";

let serviceClient: SupabaseClient | null = null;

/**
 * Service-role Supabase client. Server-only: it bypasses RLS, so it must never
 * be imported into client code (it lives behind server functions). The key is
 * read from a non-VITE env var so it's never inlined into the browser bundle.
 */
function service(): SupabaseClient {
	const url = import.meta.env.VITE_SUPABASE_URL as string;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) {
		throw new Error(
			"Voice storage is not configured (SUPABASE_SERVICE_ROLE_KEY)",
		);
	}
	if (!serviceClient) {
		serviceClient = createClient(url, key, {
			auth: { persistSession: false, autoRefreshToken: false },
		});
	}
	return serviceClient;
}

/** Mint a short-lived signed URL for a private voice object path. */
export async function signVoiceUrl(
	path: string,
	ttlSeconds = 300,
): Promise<string> {
	const { data, error } = await service()
		.storage.from(VOICE_BUCKET)
		.createSignedUrl(path, ttlSeconds);
	if (error || !data) {
		throw new Error(error?.message ?? "Could not sign the recording URL");
	}
	return data.signedUrl;
}

/**
 * Remove every uploaded file (voice notes, legacy photos) for a space. Each
 * bucket stores objects under a `${spaceId}/` prefix. Best-effort: called when
 * a space is deleted so its private media doesn't outlive it. Never throws —
 * a storage hiccup must not block the space deletion itself.
 */
export async function deleteSpaceMedia(spaceId: string): Promise<void> {
	const sb = service();
	for (const bucket of [VOICE_BUCKET, MEDIA_BUCKET]) {
		const { data, error } = await sb.storage.from(bucket).list(spaceId);
		if (error || !data || data.length === 0) continue;
		const paths = data.map((obj) => `${spaceId}/${obj.name}`);
		await sb.storage.from(bucket).remove(paths);
	}
}
