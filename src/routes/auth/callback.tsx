import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { Logo } from "#/components/logo.tsx";
import { getSupabaseBrowserClient } from "#/lib/supabase.ts";

export const Route = createFileRoute("/auth/callback")({
	component: AuthCallback,
});

function AuthCallback() {
	const navigate = useNavigate();

	useEffect(() => {
		(async () => {
			try {
				const sb = getSupabaseBrowserClient();
				await sb.auth.exchangeCodeForSession(window.location.href);
			} catch {
				/* already exchanged by detectSessionInUrl, or no code present */
			}
			// `next` is stashed before the OAuth redirect so the redirect URL itself
			// stays clean (…/auth/callback) and easy to allowlist in Supabase.
			let next = "/dashboard";
			try {
				next =
					sessionStorage.getItem("smo_next") ||
					new URLSearchParams(window.location.search).get("next") ||
					"/dashboard";
				sessionStorage.removeItem("smo_next");
			} catch {
				/* sessionStorage unavailable */
			}
			navigate({ to: next, replace: true });
		})();
	}, [navigate]);

	return (
		<div className="grid min-h-screen place-items-center">
			<div className="text-center">
				<Logo />
				<p className="mt-6 text-ink-soft">Signing you in…</p>
			</div>
		</div>
	);
}
