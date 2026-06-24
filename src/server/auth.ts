import { createServerClient } from "@supabase/ssr";
import { getCookie, getCookies, setCookie } from "@tanstack/react-start/server";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const HOST_COOKIE = "smo_host";

/**
 * Server-side Supabase client bound to the current request's cookies.
 * Used only to read the authenticated signer (auth.getUser validates the JWT).
 */
function getServerClient() {
	return createServerClient(url, anonKey, {
		cookies: {
			getAll() {
				const all = getCookies() ?? {};
				return Object.entries(all).map(([name, value]) => ({
					name,
					value: value ?? "",
				}));
			},
			setAll(cookiesToSet) {
				for (const { name, value, options } of cookiesToSet) {
					setCookie(name, value, options);
				}
			},
		},
	});
}

export type SessionUser = {
	id: string;
	email: string | null;
	name: string;
	avatarUrl: string | null;
};

/** The authenticated signer for this request, or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
	if (!url || !anonKey) return null;
	const supabase = getServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return null;
	const meta = user.user_metadata ?? {};
	return {
		id: user.id,
		email: user.email ?? null,
		name:
			(meta.full_name as string) ||
			(meta.name as string) ||
			user.email?.split("@")[0] ||
			"Guest",
		avatarUrl: (meta.avatar_url as string) ?? null,
	};
}

/** Read the host token cookie (identifies a cookie-only host), if present. */
export function getHostToken(): string | null {
	return getCookie(HOST_COOKIE) ?? null;
}

/** Read the host token, creating + setting one if it doesn't exist yet. */
export function ensureHostToken(): string {
	const existing = getHostToken();
	if (existing) return existing;
	const token = crypto.randomUUID();
	setCookie(HOST_COOKIE, token, {
		httpOnly: true,
		sameSite: "lax",
		path: "/",
		secure: import.meta.env.PROD,
		maxAge: 60 * 60 * 24 * 365,
	});
	return token;
}
