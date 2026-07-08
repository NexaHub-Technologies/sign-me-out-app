import { useLocation } from "@tanstack/react-router";
import { MessageSquarePlus } from "lucide-react";
import { useState } from "react";

import { Button } from "#/components/ui/button.tsx";
import { FeedbackDialog } from "#/features/feedback/feedback-dialog.tsx";

/**
 * Floating "Feedback" pill mounted in the root route — visible on every page
 * except the /s/ canvas, where the whole screen is drawing space and the tool
 * dock owns the bottom edge. Sits under dialogs (z-50).
 */
export function FeedbackFab() {
	const [open, setOpen] = useState(false);
	const pathname = useLocation({ select: (l) => l.pathname });
	if (pathname.startsWith("/s/")) return null;

	return (
		<>
			{!open && (
				<Button
					onClick={() => setOpen(true)}
					aria-label="Send feedback"
					className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-40 size-12 rounded-full p-0 shadow-lg sm:size-auto sm:px-4 sm:py-2"
				>
					<MessageSquarePlus className="size-5" />
					<span className="hidden sm:inline">Feedback</span>
				</Button>
			)}
			<FeedbackDialog open={open} onClose={() => setOpen(false)} />
		</>
	);
}
