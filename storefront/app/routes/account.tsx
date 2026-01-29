import { AddressDisplay } from "@app/components/checkout/address/AddressDisplay";
import { Container } from "@app/components/common/container/Container";
import { Input } from "@app/components/common/forms/inputs/Input";
import { useCustomer } from "@app/hooks/useCustomer";
import { useRegion } from "@app/hooks/useRegion";
import {
	applyPhoneInputFormatting,
	formatDate,
	formatPhoneNumberInput,
	formatPrice,
	medusaAddressToAddress,
} from "@libs/util";
import { getCustomer } from "@libs/util/server/data/customer.server";
import {
	listOrdersTracking,
	listOrdersWithCount,
} from "@libs/util/server/data/orders.server";
import type { StoreOrder } from "@medusajs/types";
import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LoaderFunctionArgs } from "react-router";
import {
	Link,
	Outlet,
	useFetcher,
	useLoaderData,
	useLocation,
	useNavigate,
	useRevalidator,
} from "react-router";

type AuthResponse = {
	success?: boolean;
	error?: string;
	email?: string;
	warning?: string;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const url = new URL(request.url);
	const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
	const pageSize = 10;

	if (url.pathname.startsWith("/account/verify-email")) {
		return {
			orders: [] as StoreOrder[],
			page,
			pageSize,
			totalPages: 1,
			totalCount: 0,
		};
	}

	const customer = await getCustomer(request);
	if (!customer)
		return {
			orders: [] as StoreOrder[],
			page,
			pageSize,
			totalPages: 1,
			totalCount: 0,
		};

	if (customer.metadata?.email_verified === false) {
		return {
			orders: [] as StoreOrder[],
			page,
			pageSize,
			totalPages: 1,
			totalCount: 0,
		};
	}

	try {
		const result = await listOrdersWithCount(
			request,
			pageSize,
			(page - 1) * pageSize,
		);
		const orders = (result?.orders ?? []) as StoreOrder[];
		const totalCount = result?.count ?? 0;
		const totalPages =
			totalCount > 0 ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1;

		let trackingByOrderId: Record<string, { packages: TrackingPackage[] }> = {};
		if (orders.length > 0) {
			const tracking = await listOrdersTracking(
				request,
				orders.map((order) => order.id),
			).catch(() => ({ orders: [] }));
			trackingByOrderId = Object.fromEntries(
				tracking.orders.map((entry) => [
					entry.order_id,
					{ packages: entry.packages ?? [] },
				]),
			);
		}

		return {
			orders,
			page,
			pageSize,
			totalPages,
			totalCount,
			trackingByOrderId,
		};
	} catch {
		return {
			orders: [] as StoreOrder[],
			page,
			pageSize,
			totalPages: 1,
			totalCount: 0,
			trackingByOrderId: {},
		};
	}
};

export const meta = () => [
	{ title: "Account | Wellness Research Supply" },
	{
		name: "description",
		content: "Manage your Wellness Research Supply account.",
	},
];

type TrackingPackage = {
	tracking_number: string;
	tracking_status?: string | null;
	tracking_url?: string | null;
	label_url?: string | null;
	shipped_at?: string | null;
};

const formatTrackingStatus = (status?: string | null) => {
	if (!status) return "Unknown";
	return status.replace("_", " ");
};

const trackingStatusClassName = (status?: string | null) => {
	if (status === "delivered") return "text-emerald-300";
	if (status === "error") return "text-red-300";
	if (status === "in_transit") return "text-amber-300";
	return "text-primary-200";
};

export default function AccountRoute() {
	const { customer } = useCustomer();
	const { orders, page, totalPages, totalCount, trackingByOrderId } =
		useLoaderData<typeof loader>();
	const { region } = useRegion();
	const revalidator = useRevalidator();
	const navigate = useNavigate();
	const location = useLocation();
	const [view, setView] = useState<"login" | "register">("login");
	const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
	const lastSuccessRef = useRef(new Map<string, unknown>());

	const loginFetcher = useFetcher<AuthResponse>();
	const registerFetcher = useFetcher<AuthResponse>();
	const logoutFetcher = useFetcher<AuthResponse>();
	const profileFetcher = useFetcher<AuthResponse>();
	const emailFetcher = useFetcher<AuthResponse>();
	const passwordFetcher = useFetcher<AuthResponse>();
	const resendFetcher = useFetcher<AuthResponse>();
	const addressFetcher = useFetcher<AuthResponse>();
	const addressActionFetcher = useFetcher<AuthResponse>();
	const addressUpdateFetcher = useFetcher<AuthResponse>();

	const emailVerified = customer?.metadata?.email_verified !== false;

	const countryOptions = useMemo(
		() =>
			(region?.countries ?? []).map((country) => ({
				value: country.iso_2,
				label: country.display_name,
			})),
		[region?.countries],
	);

	const normalizedPath = location.pathname.replace(/\/$/, "");
	const isSubRoute =
		normalizedPath.startsWith("/account/") && normalizedPath !== "/account";

	useEffect(() => {
		if (isSubRoute || revalidator.state !== "idle") {
			return;
		}

		const shouldRevalidate = (key: string, data?: { success?: boolean }) => {
			if (!data?.success) return false;
			const last = lastSuccessRef.current.get(key);
			if (last === data) return false;
			lastSuccessRef.current.set(key, data);
			return true;
		};

		const needsRevalidate = [
			["login", loginFetcher.data],
			["register", registerFetcher.data],
			["logout", logoutFetcher.data],
			["profile", profileFetcher.data],
			["email", emailFetcher.data],
			["password", passwordFetcher.data],
			["resend", resendFetcher.data],
			["address", addressFetcher.data],
			["addressAction", addressActionFetcher.data],
			["addressUpdate", addressUpdateFetcher.data],
		].some(([key, data]) =>
			shouldRevalidate(key, data as { success?: boolean } | undefined),
		);

		if (needsRevalidate) {
			revalidator.revalidate();
		}
	}, [
		loginFetcher.data,
		registerFetcher.data,
		logoutFetcher.data,
		profileFetcher.data,
		emailFetcher.data,
		passwordFetcher.data,
		resendFetcher.data,
		addressFetcher.data,
		addressActionFetcher.data,
		addressUpdateFetcher.data,
		isSubRoute,
		revalidator,
		revalidator.state,
	]);

	useEffect(() => {
		if (registerFetcher.data?.success && registerFetcher.data?.email) {
			const params = new URLSearchParams({
				email: registerFetcher.data.email,
				pending: "1",
			});
			if (registerFetcher.data?.warning) {
				params.set("warning", "1");
			}
			navigate(`/account/verify-email?${params.toString()}`);
		}
	}, [
		navigate,
		registerFetcher.data?.email,
		registerFetcher.data?.success,
		registerFetcher.data?.warning,
	]);

	useEffect(() => {
		if (emailFetcher.data?.success && emailFetcher.data?.email) {
			const params = new URLSearchParams({
				email: emailFetcher.data.email,
				pending: "1",
			});
			if (emailFetcher.data?.warning) {
				params.set("warning", "1");
			}
			navigate(`/account/verify-email?${params.toString()}`);
		}
	}, [
		emailFetcher.data?.email,
		emailFetcher.data?.success,
		emailFetcher.data?.warning,
		navigate,
	]);

	useEffect(() => {
		if (addressUpdateFetcher.data?.success) {
			setEditingAddressId(null);
		}
	}, [addressUpdateFetcher.data?.success]);

	const addresses = customer?.addresses ?? [];

	if (isSubRoute) {
		return <Outlet />;
	}

	const inputClassName =
		"bg-highlight-50/95 text-primary-50 placeholder:text-primary-200 border border-primary-50/30 shadow-[inset_0_0_0_1px_rgba(94,234,212,0.08)] focus:border-primary-400/70 focus:ring-2 focus:ring-primary-400/25 transition-shadow";

	return (
		<div className="bg-highlight-50 py-12 sm:py-20 lg:py-24">
			<Container>
				<div className="mx-auto max-w-5xl">
					<div className="rounded-[28px] border border-primary-900/15 bg-highlight-100/80 p-6 sm:p-8 lg:p-10 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.7)]">
						{customer?.id ? (
							<div className="space-y-10">
								<div className="flex flex-wrap items-start justify-between gap-6">
									<div>
										<h1 className="text-3xl font-display font-bold text-primary-50">
											Account
										</h1>
										<p className="text-primary-100 mt-2">{customer.email}</p>
										<p className="mt-2 text-sm text-primary-200">
											{emailVerified
												? "Email verified"
												: "Email verification required"}
										</p>
									</div>

									<logoutFetcher.Form
										method="post"
										action="/api/account/logout"
									>
										<button
											type="submit"
											className="inline-flex items-center justify-center rounded-full border border-primary-200/30 px-6 py-2 text-sm font-semibold text-primary-50 hover:bg-highlight-50"
										>
											Sign out
										</button>
									</logoutFetcher.Form>
								</div>

								{!emailVerified && (
									<div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6 text-amber-100">
										<h2 className="text-lg font-semibold text-amber-100">
											Verify your email
										</h2>
										<p className="mt-2 text-sm text-amber-100/80">
											Check your inbox for a verification link. You’ll need to
											verify before accessing account management and order
											history.
										</p>
										{resendFetcher.data?.error && (
											<p className="mt-3 text-sm text-red-300">
												{resendFetcher.data.error}
											</p>
										)}
										{resendFetcher.data?.success ? (
											<p className="mt-3 text-sm text-amber-100/90">
												Verification email sent.
											</p>
										) : (
											<resendFetcher.Form
												method="post"
												action="/api/account/resend-verification"
												className="mt-4"
											>
												<button
													type="submit"
													className="rounded-full bg-amber-200 px-5 py-2 text-sm font-semibold text-amber-900"
													disabled={resendFetcher.state !== "idle"}
												>
													{resendFetcher.state !== "idle"
														? "Sending…"
														: "Resend verification email"}
												</button>
											</resendFetcher.Form>
										)}
									</div>
								)}

								{emailVerified && (
									<>
										<div className="grid gap-6 lg:grid-cols-2">
											<div className="rounded-2xl border border-primary-900/15 bg-highlight-50/80 p-6 shadow-[0_18px_40px_-30px_rgba(8,15,26,0.9)]">
												<h2 className="text-lg font-semibold text-primary-50">
													Account details
												</h2>
												<p className="mt-1 text-sm text-primary-200">
													Update your name and phone number.
												</p>
												<profileFetcher.Form
													method="post"
													action="/api/account/update"
													className="mt-4 space-y-4"
												>
													<div className="grid gap-4 sm:grid-cols-2">
														<Input
															name="first_name"
															type="text"
															defaultValue={customer.first_name || ""}
															placeholder="First name"
															required
															className={inputClassName}
														/>
														<Input
															name="last_name"
															type="text"
															defaultValue={customer.last_name || ""}
															placeholder="Last name"
															required
															className={inputClassName}
														/>
													</div>
													<Input
														name="phone"
														type="tel"
														defaultValue={formatPhoneNumberInput(
															customer.phone || "",
														)}
														placeholder="Phone (optional)"
														inputMode="tel"
														autoComplete="tel"
														onInput={(event) =>
															applyPhoneInputFormatting(event.currentTarget)
														}
														className={inputClassName}
													/>
													{profileFetcher.data?.error && (
														<p className="text-sm text-red-300">
															{profileFetcher.data.error}
														</p>
													)}
													{profileFetcher.data?.success && (
														<p className="text-sm text-emerald-300">
															Account details updated.
														</p>
													)}
													<button
														type="submit"
														className="rounded-full bg-primary-600 px-6 py-2 text-sm font-semibold text-primary-900 hover:bg-primary-700"
														disabled={profileFetcher.state !== "idle"}
													>
														{profileFetcher.state !== "idle"
															? "Saving…"
															: "Save changes"}
													</button>
												</profileFetcher.Form>

												<emailFetcher.Form
													method="post"
													action="/api/account/update-email"
													className="mt-6 space-y-4"
												>
													<Input
														name="email"
														type="email"
														placeholder="New email address"
														required
														className={inputClassName}
													/>
													<p className="text-xs text-primary-200">
														Changing your email requires verification before you
														can manage your account again.
													</p>
													{emailFetcher.data?.error && (
														<p className="text-sm text-red-300">
															{emailFetcher.data.error}
														</p>
													)}
													{emailFetcher.data?.success && (
														<p className="text-sm text-emerald-300">
															Email updated. Check your inbox to verify.
														</p>
													)}
													<button
														type="submit"
														className="rounded-full border border-primary-200/30 px-6 py-2 text-sm font-semibold text-primary-50 hover:bg-highlight-50"
														disabled={emailFetcher.state !== "idle"}
													>
														{emailFetcher.state !== "idle"
															? "Updating…"
															: "Update email"}
													</button>
												</emailFetcher.Form>
											</div>

											<div className="rounded-2xl border border-primary-900/15 bg-highlight-50/80 p-6 shadow-[0_18px_40px_-30px_rgba(8,15,26,0.9)]">
												<h2 className="text-lg font-semibold text-primary-50">
													Change password
												</h2>
												<p className="mt-1 text-sm text-primary-200">
													Update your password any time.
												</p>
												<passwordFetcher.Form
													method="post"
													action="/api/account/change-password"
													className="mt-4 space-y-4"
												>
													<Input
														name="current_password"
														type="password"
														placeholder="Current password"
														required
														className={inputClassName}
													/>
													<Input
														name="new_password"
														type="password"
														placeholder="New password"
														required
														className={inputClassName}
													/>
													<p className="text-xs text-primary-200">
														Use at least 10 characters.
													</p>
													<Input
														name="confirm_password"
														type="password"
														placeholder="Confirm new password"
														required
														className={inputClassName}
													/>
													{passwordFetcher.data?.error && (
														<p className="text-sm text-red-300">
															{passwordFetcher.data.error}
														</p>
													)}
													{passwordFetcher.data?.success && (
														<p className="text-sm text-emerald-300">
															Password updated.
														</p>
													)}
													<button
														type="submit"
														className="rounded-full bg-primary-600 px-6 py-2 text-sm font-semibold text-primary-900 hover:bg-primary-700"
														disabled={passwordFetcher.state !== "idle"}
													>
														{passwordFetcher.state !== "idle"
															? "Updating…"
															: "Update password"}
													</button>
												</passwordFetcher.Form>
											</div>
										</div>

										<div className="rounded-2xl border border-primary-900/15 bg-highlight-50/80 p-6 shadow-[0_18px_40px_-30px_rgba(8,15,26,0.9)]">
											<h2 className="text-lg font-semibold text-primary-50">
												Shipping addresses
											</h2>
											<p className="mt-1 text-sm text-primary-200">
												Manage saved addresses and your default shipping
												location.
											</p>

											<div className="mt-6 space-y-4">
												{addresses.length === 0 && (
													<p className="text-sm text-primary-200">
														No saved addresses yet.
													</p>
												)}

												{addresses.map((address) => {
													const isDefault = address.is_default_shipping;
													const formattedAddress =
														medusaAddressToAddress(address);
													const isEditing = editingAddressId === address.id;

													return (
														<div
															key={address.id}
															className={clsx(
																"rounded-xl border p-4",
																isDefault
																	? "border-primary-400/40 bg-primary-900/10"
																	: "border-primary-900/15 bg-highlight-100/60",
															)}
														>
															<div className="flex flex-wrap items-start justify-between gap-4">
																<AddressDisplay
																	address={formattedAddress}
																	countryOptions={countryOptions}
																/>
																<div className="flex flex-wrap gap-2">
																	<button
																		type="button"
																		onClick={() =>
																			setEditingAddressId(
																				isEditing ? null : address.id,
																			)
																		}
																		className="rounded-full border border-primary-200/30 px-3 py-1 text-xs font-semibold text-primary-50"
																	>
																		{isEditing ? "Cancel" : "Edit"}
																	</button>
																	{isDefault ? (
																		<span className="rounded-full bg-primary-600/20 px-3 py-1 text-xs font-semibold text-primary-50">
																			Default
																		</span>
																	) : (
																		<addressActionFetcher.Form
																			method="post"
																			action="/api/account/addresses"
																		>
																			<input
																				type="hidden"
																				name="intent"
																				value="set-default"
																			/>
																			<input
																				type="hidden"
																				name="address_id"
																				value={address.id}
																			/>
																			<button
																				type="submit"
																				className="rounded-full border border-primary-200/30 px-3 py-1 text-xs font-semibold text-primary-50"
																				disabled={
																					addressActionFetcher.state !== "idle"
																				}
																			>
																				Make default
																			</button>
																		</addressActionFetcher.Form>
																	)}
																	<addressActionFetcher.Form
																		method="post"
																		action="/api/account/addresses"
																	>
																		<input
																			type="hidden"
																			name="intent"
																			value="delete"
																		/>
																		<input
																			type="hidden"
																			name="address_id"
																			value={address.id}
																		/>
																		<button
																			type="submit"
																			className="rounded-full border border-red-400/40 px-3 py-1 text-xs font-semibold text-red-200"
																			disabled={
																				addressActionFetcher.state !== "idle"
																			}
																		>
																			Remove
																		</button>
																	</addressActionFetcher.Form>
																</div>
															</div>

															{isEditing && (
																<div className="mt-6 rounded-xl border border-primary-900/15 bg-highlight-100/80 p-5">
																	<h4 className="text-sm font-semibold text-primary-50">
																		Edit address
																	</h4>
																	<addressUpdateFetcher.Form
																		method="post"
																		action="/api/account/addresses"
																		className="mt-4 grid gap-4 sm:grid-cols-2"
																	>
																		<input
																			type="hidden"
																			name="intent"
																			value="update"
																		/>
																		<input
																			type="hidden"
																			name="address_id"
																			value={address.id}
																		/>
																		<Input
																			name="address.firstName"
																			type="text"
																			placeholder="First name"
																			defaultValue={address.first_name || ""}
																			required
																			className={inputClassName}
																		/>
																		<Input
																			name="address.lastName"
																			type="text"
																			placeholder="Last name"
																			defaultValue={address.last_name || ""}
																			required
																			className={inputClassName}
																		/>
																		<Input
																			name="address.company"
																			type="text"
																			placeholder="Company (optional)"
																			defaultValue={address.company || ""}
																			className={inputClassName}
																		/>
																		<Input
																			name="address.phone"
																			type="tel"
																			placeholder="Phone (optional)"
																			defaultValue={formatPhoneNumberInput(
																				address.phone || "",
																			)}
																			inputMode="tel"
																			autoComplete="tel"
																			onInput={(event) =>
																				applyPhoneInputFormatting(
																					event.currentTarget,
																				)
																			}
																			className={inputClassName}
																		/>
																		<Input
																			name="address.address1"
																			type="text"
																			placeholder="Address"
																			defaultValue={address.address_1 || ""}
																			required
																			className={`${inputClassName} sm:col-span-2`}
																		/>
																		<Input
																			name="address.address2"
																			type="text"
																			placeholder="Apartment, suite, etc."
																			defaultValue={address.address_2 || ""}
																			className={`${inputClassName} sm:col-span-2`}
																		/>
																		<Input
																			name="address.city"
																			type="text"
																			placeholder="City"
																			defaultValue={address.city || ""}
																			required
																			className={inputClassName}
																		/>
																		<Input
																			name="address.province"
																			type="text"
																			placeholder="State / Province"
																			defaultValue={address.province || ""}
																			required
																			className={inputClassName}
																		/>
																		<Input
																			name="address.postalCode"
																			type="text"
																			placeholder="Postal code"
																			defaultValue={address.postal_code || ""}
																			required
																			className={inputClassName}
																		/>
																		<div className="sm:col-span-1">
																			<select
																				name="address.countryCode"
																				defaultValue={
																					address.country_code || ""
																				}
																				required
																				className="focus:ring-primary-500 focus:border-primary-500 block h-12 w-full cursor-pointer rounded-md border border-primary-900/20 bg-highlight-50 px-3 text-sm text-primary-50 shadow-sm outline-none focus:ring-1"
																			>
																				<option value="">
																					Select a country
																				</option>
																				{countryOptions.map((option) => (
																					<option
																						key={option.value}
																						value={option.value}
																					>
																						{option.label}
																					</option>
																				))}
																			</select>
																		</div>
																		<div className="sm:col-span-2 flex flex-wrap items-center gap-4 text-sm text-primary-200">
																			<div className="inline-flex items-center gap-2">
																				<input
																					id={`address-default-${address.id}`}
																					name="set_default"
																					type="checkbox"
																					className="accent-primary-500 text-primary-500 focus:ring-primary-400 block h-4 w-4 rounded border border-primary-200/40 bg-highlight-50/80 shadow-sm focus:ring-2 focus:ring-offset-0"
																				/>
																				<span>
																					Make this my default shipping address
																				</span>
																			</div>
																		</div>
																		{addressUpdateFetcher.data?.error && (
																			<p className="text-sm text-red-300 sm:col-span-2">
																				{addressUpdateFetcher.data.error}
																			</p>
																		)}
																		{addressUpdateFetcher.data?.success && (
																			<p className="text-sm text-emerald-300 sm:col-span-2">
																				Address updated.
																			</p>
																		)}
																		<div className="sm:col-span-2">
																			<button
																				type="submit"
																				className="rounded-full bg-primary-600 px-6 py-2 text-sm font-semibold text-primary-900 hover:bg-primary-700"
																				disabled={
																					addressUpdateFetcher.state !== "idle"
																				}
																			>
																				{addressUpdateFetcher.state !== "idle"
																					? "Saving…"
																					: "Save changes"}
																			</button>
																		</div>
																	</addressUpdateFetcher.Form>
																</div>
															)}
														</div>
													);
												})}
											</div>

											<div className="mt-8 rounded-xl border border-primary-900/15 bg-highlight-100/80 p-6">
												<h3 className="text-base font-semibold text-primary-50">
													Add a new address
												</h3>
												<addressFetcher.Form
													method="post"
													action="/api/account/addresses"
													className="mt-4 grid gap-4 sm:grid-cols-2"
												>
													<input type="hidden" name="intent" value="create" />
													<Input
														name="address.firstName"
														type="text"
														placeholder="First name"
														required
														className={inputClassName}
													/>
													<Input
														name="address.lastName"
														type="text"
														placeholder="Last name"
														required
														className={inputClassName}
													/>
													<Input
														name="address.company"
														type="text"
														placeholder="Company (optional)"
														className={inputClassName}
													/>
													<Input
														name="address.phone"
														type="tel"
														placeholder="Phone (optional)"
														inputMode="tel"
														autoComplete="tel"
														onInput={(event) =>
															applyPhoneInputFormatting(event.currentTarget)
														}
														className={inputClassName}
													/>
													<Input
														name="address.address1"
														type="text"
														placeholder="Address"
														required
														className={`${inputClassName} sm:col-span-2`}
													/>
													<Input
														name="address.address2"
														type="text"
														placeholder="Apartment, suite, etc."
														className={`${inputClassName} sm:col-span-2`}
													/>
													<Input
														name="address.city"
														type="text"
														placeholder="City"
														required
														className={inputClassName}
													/>
													<Input
														name="address.province"
														type="text"
														placeholder="State / Province"
														required
														className={inputClassName}
													/>
													<Input
														name="address.postalCode"
														type="text"
														placeholder="Postal code"
														required
														className={inputClassName}
													/>
													<div className="sm:col-span-1">
														<select
															name="address.countryCode"
															defaultValue={region?.countries?.[0]?.iso_2 ?? ""}
															required
															className="focus:ring-primary-500 focus:border-primary-500 block h-12 w-full cursor-pointer rounded-md border border-primary-900/20 bg-highlight-50 px-3 text-sm text-primary-50 shadow-sm outline-none focus:ring-1"
														>
															<option value="">Select a country</option>
															{countryOptions.map((option) => (
																<option key={option.value} value={option.value}>
																	{option.label}
																</option>
															))}
														</select>
													</div>
													<div className="sm:col-span-2 flex flex-wrap items-center gap-4 text-sm text-primary-200">
														<div className="inline-flex items-center gap-2">
															<input
																id="address-default-new"
																name="set_default"
																type="checkbox"
																className="accent-primary-500 text-primary-500 focus:ring-primary-400 block h-4 w-4 rounded border border-primary-200/40 bg-highlight-50/80 shadow-sm focus:ring-2 focus:ring-offset-0"
															/>
															<span>Make this my default shipping address</span>
														</div>
													</div>
													{addressFetcher.data?.error && (
														<p className="text-sm text-red-300 sm:col-span-2">
															{addressFetcher.data.error}
														</p>
													)}
													{addressFetcher.data?.success && (
														<p className="text-sm text-emerald-300 sm:col-span-2">
															Address saved.
														</p>
													)}
													<div className="sm:col-span-2">
														<button
															type="submit"
															className="rounded-full bg-primary-600 px-6 py-2 text-sm font-semibold text-primary-900 hover:bg-primary-700"
															disabled={addressFetcher.state !== "idle"}
														>
															{addressFetcher.state !== "idle"
																? "Saving…"
																: "Save address"}
														</button>
													</div>
												</addressFetcher.Form>
											</div>
										</div>

										<div className="rounded-2xl border border-primary-900/15 bg-highlight-50/80 p-6 shadow-[0_18px_40px_-30px_rgba(8,15,26,0.9)]">
											<h2 className="text-lg font-semibold text-primary-50">
												Order history
											</h2>
											<p className="mt-1 text-sm text-primary-200">
												Review your recent orders and totals.
											</p>

											<div className="mt-6 space-y-4">
												{orders.length === 0 && (
													<p className="text-sm text-primary-200">
														{totalCount === 0
															? "No orders yet."
															: "No orders on this page."}
													</p>
												)}
												{orders.map((order) => {
													const tracking = trackingByOrderId?.[order.id];
													const packages = tracking?.packages ?? [];
													return (
														<div
															key={order.id}
															className="rounded-xl border border-primary-900/10 p-4"
														>
															<div className="flex flex-wrap items-start justify-between gap-4">
																<div>
																	<p className="text-sm text-primary-200">
																		Order #{order.display_id}
																	</p>
																	<p className="text-primary-50 font-semibold">
																		{formatDate(
																			new Date(order.created_at as string),
																		)}
																	</p>
																	<p className="text-sm text-primary-200 capitalize">
																		Status:{" "}
																		{order.status?.replace("_", " ") ??
																			"processing"}
																	</p>
																	{packages.length > 0 ? (
																		<div className="mt-3 space-y-2">
																			<p className="text-xs uppercase tracking-[0.2em] text-primary-300">
																				Tracking
																			</p>
																			<div className="space-y-1">
																				{packages.map((pkg) => (
																					<div
																						key={pkg.tracking_number}
																						className="text-xs text-primary-200"
																					>
																						<span
																							className={trackingStatusClassName(
																								pkg.tracking_status,
																							)}
																						>
																							{formatTrackingStatus(
																								pkg.tracking_status,
																							)}
																						</span>
																						<span className="mx-2 text-primary-300">
																							·
																						</span>
																						{pkg.tracking_url ? (
																							<a
																								href={pkg.tracking_url}
																								target="_blank"
																								rel="noreferrer"
																								className="text-primary-50 underline decoration-primary-200/40 underline-offset-4"
																							>
																								{pkg.tracking_number}
																							</a>
																						) : (
																							<span className="text-primary-200">
																								{pkg.tracking_number}
																							</span>
																						)}
																					</div>
																				))}
																			</div>
																		</div>
																	) : (
																		<p className="mt-3 text-xs text-primary-300">
																			Tracking will appear once shipped.
																		</p>
																	)}
																	<Link
																		to={`/account/orders/${order.id}`}
																		className="mt-2 inline-flex text-sm font-semibold text-primary-200 hover:text-primary-50"
																	>
																		View details
																	</Link>
																</div>
																<div className="text-right">
																	<p className="text-xs uppercase text-primary-200">
																		Total
																	</p>
																	<p className="text-primary-50 text-lg font-semibold">
																		{formatPrice(order.total || 0, {
																			currency: order.currency_code,
																		})}
																	</p>
																</div>
															</div>
														</div>
													);
												})}
											</div>

											{totalCount > 0 && totalPages > 1 && (
												<div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-primary-200">
													<div>
														Page {page} of {totalPages}
													</div>
													<div className="flex gap-3">
														{page > 1 && (
															<Link
																to={`/account?page=${page - 1}`}
																className="rounded-full border border-primary-200/30 px-4 py-2 text-primary-50"
															>
																Previous
															</Link>
														)}
														{page < totalPages && (
															<Link
																to={`/account?page=${page + 1}`}
																className="rounded-full border border-primary-200/30 px-4 py-2 text-primary-50"
															>
																Next
															</Link>
														)}
													</div>
												</div>
											)}
										</div>
									</>
								)}
							</div>
						) : (
							<div className="space-y-6 sm:space-y-8">
								<div>
									<h1 className="text-2xl sm:text-3xl font-display font-bold text-primary-50">
										{view === "login" ? "Sign in" : "Create account"}
									</h1>
									<p className="text-primary-100 mt-2">
										Access your account and manage your research orders.
									</p>
								</div>

								<div className="flex gap-2 rounded-full bg-highlight-50 p-1 text-xs sm:text-sm">
									<button
										type="button"
										className={clsx(
											"flex-1 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 font-medium transition",
											view === "login"
												? "bg-primary-600 text-primary-900"
												: "text-primary-100 hover:text-primary-50",
										)}
										onClick={() => setView("login")}
									>
										Sign in
									</button>
									<button
										type="button"
										className={clsx(
											"flex-1 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 font-medium transition",
											view === "register"
												? "bg-primary-600 text-primary-900"
												: "text-primary-100 hover:text-primary-50",
										)}
										onClick={() => setView("register")}
									>
										Register
									</button>
								</div>

								{view === "login" ? (
									<loginFetcher.Form
										method="post"
										action="/api/account/login"
										className="space-y-4"
									>
										<Input
											name="email"
											type="email"
											placeholder="Email"
											required
											className={inputClassName}
										/>
										<Input
											name="password"
											type="password"
											placeholder="Password"
											required
											className={inputClassName}
										/>
										{loginFetcher.data?.error && (
											<p className="text-sm text-red-300">
												{loginFetcher.data.error}
											</p>
										)}
										<button
											type="submit"
											className="w-full rounded-full bg-primary-600 px-6 py-3 text-sm font-semibold text-primary-900 hover:bg-primary-700"
										>
											Sign in
										</button>
										<div className="text-center">
											<Link
												to="/account/forgot-password"
												className="text-sm text-primary-200 hover:text-primary-50"
											>
												Forgot password?
											</Link>
										</div>
									</loginFetcher.Form>
								) : (
									<registerFetcher.Form
										method="post"
										action="/api/account/register"
										className="space-y-4"
									>
										<div className="grid gap-4 sm:grid-cols-2">
											<Input
												name="first_name"
												type="text"
												placeholder="First name"
												required
												className={inputClassName}
											/>
											<Input
												name="last_name"
												type="text"
												placeholder="Last name"
												required
												className={inputClassName}
											/>
										</div>
										<Input
											name="email"
											type="email"
											placeholder="Email"
											required
											className={inputClassName}
										/>
										<Input
											name="phone"
											type="tel"
											placeholder="Phone (optional)"
											inputMode="tel"
											autoComplete="tel"
											onInput={(event) =>
												applyPhoneInputFormatting(event.currentTarget)
											}
											className={inputClassName}
										/>
										<Input
											name="password"
											type="password"
											placeholder="Password"
											required
											className={inputClassName}
										/>
										{registerFetcher.data?.error && (
											<p className="text-sm text-red-300">
												{registerFetcher.data.error}
											</p>
										)}
										<button
											type="submit"
											className="w-full rounded-full bg-primary-600 px-6 py-3 text-sm font-semibold text-primary-900 hover:bg-primary-700"
										>
											Create account
										</button>
									</registerFetcher.Form>
								)}
							</div>
						)}
					</div>
				</div>
			</Container>
		</div>
	);
}
