import { Container } from "@app/components/common/container/Container";
import { Input } from "@app/components/common/forms/inputs/Input";
import { Link, useFetcher, useSearchParams } from "react-router";

export const meta = () => [
	{ title: "Verify Email | Wellness Research Supply" },
	{ name: "description", content: "Verify your email address." },
];

export default function VerifyEmailRoute() {
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token");
	const email = searchParams.get("email");
	const pending = searchParams.get("pending") === "1";
	const warning = searchParams.get("warning") === "1";

	const fetcher = useFetcher<{ success?: boolean; error?: string }>();
	const resendFetcher = useFetcher<{ success?: boolean; error?: string }>();
	const success = fetcher.data?.success;
	const error = fetcher.data?.error;
	const canVerify = !!token && !!email;

	return (
		<div className="bg-highlight-50 py-16 sm:py-24 min-h-[60vh] flex items-center justify-center">
			<Container>
				<div className="mx-auto max-w-lg">
					<div className="rounded-2xl border border-primary-900/10 bg-highlight-100 p-8 shadow-sm">
						<div className="space-y-6">
							<div>
								<h1 className="text-3xl font-display font-bold text-primary-50">
									Verify email
								</h1>
								<p className="text-primary-100 mt-2">
									{success
										? "Your email has been verified."
										: error
											? "There was a problem verifying your email."
											: pending && email
												? "Check your email for the verification link."
												: "Please click the button below to verify your email address."}
								</p>
							</div>

							{success ? (
								<div className="space-y-4">
									<div className="rounded-xl border border-green-900/20 bg-green-900/10 p-4 text-green-200">
										<p className="font-medium">Verification successful</p>
										<p className="mt-1 text-sm text-green-200/80">
											Thank you for verifying your email address.
										</p>
									</div>
									<Link
										to="/account"
										className="block w-full text-center rounded-full bg-primary-600 px-6 py-3 text-sm font-semibold text-primary-900 hover:bg-primary-700 transition-colors"
									>
										Continue to Account
									</Link>
								</div>
							) : (
							<div className="space-y-4">
								{error && (
									<div className="rounded-xl border border-red-900/20 bg-red-900/10 p-4 text-red-300">
										<p className="font-medium">Verification failed</p>
										<p className="mt-1 text-sm text-red-300/80">{error}</p>
									</div>
								)}

									{warning && !pending && (
										<div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-100">
											<p className="font-medium">Verification email not sent</p>
											<p className="mt-1 text-sm text-amber-100/80">
												We couldn’t send your verification email. Please resend it below.
											</p>
										</div>
									)}

									{!canVerify && !pending ? (
										<div className="space-y-4">
											<div className="text-center p-4">
												<p className="text-red-300 mb-4">
													Invalid verification link.
												</p>
												<Link
													to="/account"
													className="text-primary-200 hover:text-primary-50 underline"
												>
													Return to account page
												</Link>
											</div>

											<div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-100">
												<p className="font-medium">Resend verification email</p>
												{resendFetcher.data?.error && (
													<p className="mt-2 text-sm text-red-300">{resendFetcher.data.error}</p>
												)}
												{resendFetcher.data?.success ? (
													<p className="mt-2 text-sm text-amber-100/90">
														If an account exists for that email, a verification link was sent.
													</p>
												) : (
													<resendFetcher.Form
														method="post"
														action="/api/account/resend-verification-public"
														className="mt-3 space-y-3"
													>
														<Input
															name="email"
															type="email"
															placeholder="Email address"
															required
															className="bg-highlight-50 text-primary-50 placeholder:text-primary-200"
														/>
														<button
															type="submit"
															disabled={resendFetcher.state !== "idle"}
															className="rounded-full bg-amber-200 px-5 py-2 text-sm font-semibold text-amber-900"
														>
															{resendFetcher.state !== "idle" ? "Sending..." : "Resend verification email"}
														</button>
													</resendFetcher.Form>
												)}
											</div>
										</div>
									) : canVerify ? (
										<fetcher.Form
											method="post"
											action="/api/account/verify-email"
										>
											<input type="hidden" name="token" value={token ?? ""} />
											<input type="hidden" name="email" value={email ?? ""} />

											<button
												type="submit"
												disabled={fetcher.state !== "idle"}
												className="w-full rounded-full bg-primary-600 px-6 py-3 text-sm font-semibold text-primary-900 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
											>
												{fetcher.state !== "idle"
													? "Verifying..."
													: "Verify Email"}
											</button>
										</fetcher.Form>
									) : (
										<div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-100">
											{warning ? (
												<>
													<p className="font-medium">Verification email not sent</p>
													<p className="mt-1 text-sm text-amber-100/80">
														We couldn’t send your verification email. Please resend it below.
													</p>
												</>
											) : (
												<>
													<p className="font-medium">Verification link sent</p>
													<p className="mt-1 text-sm text-amber-100/80">
														Check your email and click the verification link.
													</p>
												</>
											)}
											{resendFetcher.data?.error && (
												<p className="mt-2 text-sm text-red-300">{resendFetcher.data.error}</p>
											)}
											{resendFetcher.data?.success ? (
												<p className="mt-2 text-sm text-amber-100/90">
													If an account exists for that email, a verification link was sent.
												</p>
											) : (
												<resendFetcher.Form
													method="post"
													action="/api/account/resend-verification-public"
													className="mt-4 space-y-3"
												>
													<Input
														name="email"
														type="email"
														placeholder="Email address"
														defaultValue={email ?? ''}
														required
														className="bg-highlight-50 text-primary-50 placeholder:text-primary-200"
													/>
													<button
														type="submit"
														disabled={resendFetcher.state !== "idle"}
														className="rounded-full bg-amber-200 px-5 py-2 text-sm font-semibold text-amber-900"
													>
														{resendFetcher.state !== "idle" ? "Sending..." : "Resend verification email"}
													</button>
												</resendFetcher.Form>
											)}
										</div>
									)}
								</div>
							)}
						</div>
					</div>
				</div>
			</Container>
		</div>
	);
}
