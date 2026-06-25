import { createServerFn } from "@tanstack/react-start";

import { getSessionUser } from "#/server/auth.ts";

/**
 * Read the current session user from a route. The handler (and its server-only
 * `getSessionUser` import) is stripped from the client bundle and called via RPC,
 * so this is safe to import into client route code — unlike `auth.ts`, which
 * imports server-only cookie APIs at the top level.
 */
export const fetchSessionUser = createServerFn({ method: "GET" }).handler(
	async () => getSessionUser(),
);
