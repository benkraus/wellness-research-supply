import { randomUUID } from "node:crypto";
import { baseMedusaConfig, sdk } from "@libs/util/server/client.server";
import { config } from "@libs/util/server/config.server";
import { setAuthToken } from "@libs/util/server/cookies.server";
import { data } from "react-router";

const getStorefrontUrl = (request: Request) => {
	return config.STOREFRONT_URL ?? new URL(request.url).origin;
};

export const action = async ({ request }: { request: Request }) => {
	const MIN_PASSWORD_LENGTH = 10;
	const formData = await request.formData();
	const email = String(formData.get("email") || "").trim();
	const password = String(formData.get("password") || "").trim();
	const firstName = String(formData.get("first_name") || "").trim();
	const lastName = String(formData.get("last_name") || "").trim();
	const phone = String(formData.get("phone") || "").trim();

	if (!email || !password || !firstName || !lastName) {
		return data(
			{ error: "First name, last name, email, and password are required." },
			{ status: 400 },
		);
	}

	if (password.length < MIN_PASSWORD_LENGTH) {
		return data(
			{ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
			{ status: 400 },
		);
	}

	const token = await sdk.auth.register("customer", "emailpass", {
		email,
		password,
	});

	if (typeof token !== "string") {
		return data(
			{ error: "Registration requires additional steps." },
			{ status: 400 },
		);
	}

	const headers = new Headers();
	await setAuthToken(headers, token);

	await sdk.store.customer.create(
		{
			email,
			first_name: firstName,
			last_name: lastName,
			phone: phone || undefined,
		},
		{},
		{
			Authorization: `Bearer ${token}`,
		},
	);

	const verificationToken = randomUUID();
	const verificationTimestamp = new Date().toISOString();
	const storefrontUrl = getStorefrontUrl(request);
	const verificationUrl = new URL("/account/verify-email", storefrontUrl);
	verificationUrl.searchParams.set("token", verificationToken);
	verificationUrl.searchParams.set("email", email);

	try {
		await sdk.store.customer.update(
			{
				metadata: {
					email_verification_token: verificationToken,
					email_verified: false,
					email_verification_token_created_at: verificationTimestamp,
					email_verification_last_sent_at: verificationTimestamp,
				},
			},
			{},
			{
				Authorization: `Bearer ${token}`,
			},
		);

		const response = await fetch(
			new URL("/store/account/email-verification", baseMedusaConfig.baseUrl),
			{
				method: "POST",
				headers: {
					"content-type": "application/json",
					"x-publishable-api-key": baseMedusaConfig.publishableKey ?? "",
				},
				body: JSON.stringify({
					email,
					token: verificationToken,
					verificationLink: verificationUrl.toString(),
				}),
			},
		);

		if (!response.ok) {
			throw new Error("Verification email send failed.");
		}
	} catch (error) {
		console.error("Failed to send verification email", error);
		return data(
			{
				success: true,
				email,
				warning:
					"Account created, but we couldn't send the verification email. Please resend it from your account page.",
			},
			{ headers },
		);
	}

	return data({ success: true, email }, { headers });
};
