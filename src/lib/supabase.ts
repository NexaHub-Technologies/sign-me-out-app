import { createBrowserClient } from "@supabase/ssr";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Browser-side Supabase client — used for OAuth sign-in, Realtime subscriptions,
 * and Storage uploads. Writes to the DB go through server functions (Drizzle), not
 * this client. Created lazily so SSR/build doesn't fail when env is absent.
 */
let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
	if (typeof window === "undefined") {
		throw new Error("getSupabaseBrowserClient() must be called in the browser");
	}
	if (!url || !anonKey || anonKey.startsWith("REPLACE_WITH")) {
		throw new Error(
			"Supabase env missing: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local",
		);
	}
	if (!client) {
		client = createBrowserClient(url, anonKey);
	}
	return client;
}

export function isSupabaseConfigured() {
	return Boolean(url && anonKey && !anonKey.startsWith("REPLACE_WITH"));
}
