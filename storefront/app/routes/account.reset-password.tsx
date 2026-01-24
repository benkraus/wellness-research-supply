import { Container } from "@app/components/common/container/Container";
import { Input } from "@app/components/common/forms/inputs/Input";
import { useEffect, useRef } from "react";
import { Link, useFetcher, useSearchParams } from "react-router";

export const meta = () => [
	{ title: "Reset Password | Wellness Research Supply" },
	{ name: "description", content: "Set a new password for your account." },
];

export default function ResetPasswordRoute() {
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token");
	const email = searchParams.get("email");

	const fetcher = useFetcher<{ success?: boolean; error?: string }>();
	const formRef = useRef<HTMLFormElement>(null);
	const success = fetcher.data?.success;

	useEffect(() => {
		if (success && formRef.current) {
			formRef.current.reset();
		}
	}, [success]);

	if (!token || !email) {
		return (
			<div className="bg-highlight-50 py-16 sm:py-24 min-h-[60vh] flex items-center justify-center">
				<Container>
					<div className="mx-auto max-w-lg">
						<div className="rounded-2xl border border-primary-900/10 bg-highlight-100 p-8 shadow-sm">
							<div className="text-center space-y-4">
								<h1 className="text-2xl font-display font-bold text-red-300">
									Invalid Link
								</h1>
								<p className="text-primary-100">
									This password reset link is invalid or incomplete. Please
									request a new one.
								</p>
								<Link
									to="/account/forgot-password"
									className="inline-block rounded-full bg-primary-600 px-6 py-3 text-sm font-semibold text-primary-900 hover:bg-primary-700 transition-colors"
								>
									Request new link
								</Link>
							</div>
						</div>
					</div>
				</Container>
			</div>
		);
	}

	return (
		<div className="bg-highlight-50 py-16 sm:py-24 min-h-[60vh] flex items-center justify-center">
			<Container>
				<div className="mx-auto max-w-lg">
					<div className="rounded-2xl border border-primary-900/10 bg-highlight-100 p-8 shadow-sm">
						<div className="space-y-6">
							<div>
								<h1 className="text-3xl font-display font-bold text-primary-50">
									New password
								</h1>
								<p className="text-primary-100 mt-2">
									Create a new password for {email}
								</p>
							</div>

							{success ? (
								<div className="rounded-xl border border-green-900/20 bg-green-900/10 p-4 text-green-200">
									<p className="font-medium">Password reset successfully</p>
									<p className="mt-1 text-sm text-green-200/80">
										Your password has been updated. You can now sign in with
										your new password.
									</p>
									<div className="mt-4">
										<Link
											to="/account"
											className="inline-block rounded-full bg-green-600 px-6 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
										>
											Sign in
										</Link>
									</div>
								</div>
							) : (
								<fetcher.Form
									method="post"
									action="/api/account/reset-password"
									className="space-y-4"
									ref={formRef}
								>
									<input type="hidden" name="token" value={token} />
									<input type="hidden" name="email" value={email} />

									<Input
										name="password"
										type="password"
										placeholder="New password"
										required
										autoComplete="new-password"
										className="bg-highlight-50 text-primary-50 placeholder:text-primary-200"
									/>
									<p className="text-xs text-primary-200">Use at least 10 characters.</p>

									{/* Note: In a real app we might want client-side confirmation validation, 
                      but the API handles the actual reset. The API only takes 'password'. */}

									{fetcher.data?.error && (
										<p className="text-sm text-red-300">{fetcher.data.error}</p>
									)}

									<button
										type="submit"
										disabled={fetcher.state !== "idle"}
										className="w-full rounded-full bg-primary-600 px-6 py-3 text-sm font-semibold text-primary-900 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									>
										{fetcher.state !== "idle"
											? "Resetting..."
											: "Reset password"}
									</button>
								</fetcher.Form>
							)}
						</div>
					</div>
				</div>
			</Container>
		</div>
	);
}
