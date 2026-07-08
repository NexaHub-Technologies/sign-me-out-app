import { createServerFn } from "@tanstack/react-start";

import { getSessionUser } from "#/server/auth.ts";
import {
	type FeedbackInput,
	saveAndDeliverFeedback,
} from "#/server/feedback-core.ts";

/**
 * Submit user feedback: saved to the feedback table, then best-effort emailed
 * to the inbox. Anonymous submissions are fine — the session identity is
 * attached when present. Client-importable — keep this module server-fn-only
 * (see payments.ts for why).
 */
export const sendFeedback = createServerFn({ method: "POST" })
	.validator((input: FeedbackInput) => input)
	.handler(async ({ data }) =>
		saveAndDeliverFeedback(data, await getSessionUser()),
	);
