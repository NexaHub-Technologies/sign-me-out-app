import { getSupabaseBrowserClient } from "#/lib/supabase.ts";

/**
 * Start Google OAuth. `next` is the path to return to after the round-trip; it's
 * stashed in sessionStorage so the redirect URL stays clean (…/auth/callback)
 * and matches the Supabase allowlist exactly. Returns an error message or null.
 */
export async function signInWithGoogle(next: string): Promise<string | null> {
	try {
		sessionStorage.setItem("smo_next", next);
	} catch {
		/* sessionStorage unavailable */
	}
	const sb = getSupabaseBrowserClient();
	const { error } = await sb.auth.signInWithOAuth({
		provider: "google",
		options: { redirectTo: `${location.origin}/auth/callback` },
	});
	return error?.message ?? null;
}

/** Sign the current user out, clearing the session cookies. */
export async function signOut(): Promise<string | null> {
	const sb = getSupabaseBrowserClient();
	const { error } = await sb.auth.signOut();
	return error?.message ?? null;
}
