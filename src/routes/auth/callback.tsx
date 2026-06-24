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
				/* already exchanged or no code */
			}
			const next =
				new URLSearchParams(window.location.search).get("next") || "/dashboard";
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
