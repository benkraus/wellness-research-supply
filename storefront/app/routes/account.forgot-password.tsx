import { Container } from "@app/components/common/container/Container";
import { Input } from "@app/components/common/forms/inputs/Input";
import { useEffect, useRef } from "react";
import { Link, useFetcher } from "react-router";

export const meta = () => [
	{ title: "Forgot Password | Wellness Research Supply" },
	{ name: "description", content: "Reset your password." },
];

export default function ForgotPasswordRoute() {
	const fetcher = useFetcher<{ success?: boolean; error?: string }>();
	const formRef = useRef<HTMLFormElement>(null);
	const success = fetcher.data?.success;

	useEffect(() => {
		if (success && formRef.current) {
			formRef.current.reset();
		}
	}, [success]);

	return (
		<div className="bg-highlight-50 py-16 sm:py-24 min-h-[60vh] flex items-center justify-center">
			<Container>
				<div className="mx-auto max-w-lg">
					<div className="rounded-2xl border border-primary-900/10 bg-highlight-100 p-8 shadow-sm">
						<div className="space-y-6">
							<div>
								<h1 className="text-3xl font-display font-bold text-primary-50">
									Reset password
								</h1>
								<p className="text-primary-100 mt-2">
									Enter your email address and we'll send you a link to reset
									your password.
								</p>
							</div>

							{success ? (
								<div className="rounded-xl border border-green-900/20 bg-green-900/10 p-4 text-green-200">
									<p className="font-medium">Check your email</p>
									<p className="mt-1 text-sm text-green-200/80">
										If an account exists with that email, we've sent password
										reset instructions.
									</p>
									<div className="mt-4">
										<Link
											to="/account"
											className="text-sm font-medium text-green-200 hover:text-green-100 underline decoration-green-200/30 hover:decoration-green-100"
										>
											Back to sign in
										</Link>
									</div>
								</div>
							) : (
								<fetcher.Form
									method="post"
									action="/api/account/request-password-reset"
									className="space-y-4"
									ref={formRef}
								>
									<Input
										name="email"
										type="email"
										placeholder="Email address"
										required
										autoComplete="email"
										className="bg-highlight-50 text-primary-50 placeholder:text-primary-200"
									/>

									{fetcher.data?.error && (
										<p className="text-sm text-red-300">{fetcher.data.error}</p>
									)}

									<button
										type="submit"
										disabled={fetcher.state !== "idle"}
										className="w-full rounded-full bg-primary-600 px-6 py-3 text-sm font-semibold text-primary-900 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									>
										{fetcher.state !== "idle"
											? "Sending..."
											: "Send reset link"}
									</button>

									<div className="text-center">
										<Link
											to="/account"
											className="text-sm text-primary-200 hover:text-primary-50 transition-colors"
										>
											Back to sign in
										</Link>
									</div>
								</fetcher.Form>
							)}
						</div>
					</div>
				</div>
			</Container>
		</div>
	);
}
