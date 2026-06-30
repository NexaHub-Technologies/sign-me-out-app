// Minimal type declarations for @paystack/inline-js (the package ships none).
// Covers only what this app uses: the default-exported popup class and the
// resumeTransaction flow (access code + lifecycle callbacks).
declare module "@paystack/inline-js" {
	export interface ResumeTransactionOptions {
		onSuccess?: (transaction: {
			reference: string;
			[key: string]: unknown;
		}) => void;
		onCancel?: () => void;
		onError?: (error: { message?: string; [key: string]: unknown }) => void;
		onLoad?: (response: unknown) => void;
	}

	export default class PaystackPop {
		resumeTransaction(
			accessCode: string,
			options?: ResumeTransactionOptions,
		): void;
	}
}
