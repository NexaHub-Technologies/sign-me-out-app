import { useEffect, useState } from "react";

import {
	getSupabaseBrowserClient,
	isSupabaseConfigured,
} from "#/lib/supabase.ts";

export type SessionUser = {
	id: string;
	name: string;
	avatarUrl: string | null;
};

// biome-ignore lint/suspicious/noExplicitAny: supabase user is loosely typed
function toUser(u: any): SessionUser {
	const m = u.user_metadata ?? {};
	return {
		id: u.id,
		name: m.full_name || m.name || u.email?.split("@")[0] || "Signer",
		avatarUrl: m.avatar_url ?? null,
	};
}

/** The current signer (Supabase Auth), kept in sync via onAuthStateChange. */
export function useSessionUser() {
	const [user, setUser] = useState<SessionUser | null>(null);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		if (!isSupabaseConfigured()) {
			setReady(true);
			return;
		}
		const sb = getSupabaseBrowserClient();
		// Seed from the persisted session (read locally from the cookie, no network
		// round-trip) so a returning user's signed-in state shows immediately.
		sb.auth
			.getSession()
			.then((res: { data: { session: { user?: unknown } | null } }) => {
				setUser(res.data.session?.user ? toUser(res.data.session.user) : null);
				setReady(true);
			});
		const { data: sub } = sb.auth.onAuthStateChange(
			(_event: unknown, session: { user?: unknown } | null) => {
				setUser(session?.user ? toUser(session.user) : null);
				setReady(true);
			},
		);
		return () => sub.subscription.unsubscribe();
	}, []);

	return { user, ready };
}
