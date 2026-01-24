import { randomUUID } from "node:crypto";
import { baseMedusaConfig } from "@libs/util/server/client.server";
import { config } from "@libs/util/server/config.server";
import { getCustomer, updateCustomer } from "@libs/util/server/data/customer.server";
import { data } from "react-router";

const getStorefrontUrl = (request: Request) => {
	return config.STOREFRONT_URL ?? new URL(request.url).origin;
};

export const action = async ({ request }: { request: Request }) => {
	const formData = await request.formData();
	const email = String(formData.get("email") || "").trim().toLowerCase();

	if (!email) {
		return data({ error: "Email is required." }, { status: 400 });
	}

	const customer = await getCustomer(request);
	if (!customer) {
		return data({ error: "You must be signed in." }, { status: 401 });
	}

	if (customer.metadata?.email_verified === false) {
		return data({ error: "Please verify your current email before changing it." }, { status: 403 });
	}

	if (customer.email?.toLowerCase() === email) {
		return data({ error: "That email is already on your account." }, { status: 400 });
	}

	const verificationToken = randomUUID();
	const verificationTimestamp = new Date().toISOString();
	const storefrontUrl = getStorefrontUrl(request);
	const verificationUrl = new URL("/account/verify-email", storefrontUrl);
	verificationUrl.searchParams.set("token", verificationToken);
	verificationUrl.searchParams.set("email", email);

	try {
		await updateCustomer(request, {
			email,
			metadata: {
				...(customer.metadata ?? {}),
				email_verification_token: verificationToken,
				email_verified: false,
				email_verification_token_created_at: verificationTimestamp,
				email_verification_last_sent_at: verificationTimestamp,
			},
		});
	} catch (error) {
		return data({ error: "Unable to update email." }, { status: 400 });
	}

	try {
		const response = await fetch(new URL("/store/account/email-verification", baseMedusaConfig.baseUrl), {
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
		});

		if (!response.ok) {
			throw new Error("Verification email send failed.");
		}
	} catch (error) {
		return data(
			{
				success: true,
				email,
				warning:
					"Email updated, but we couldn't send the verification email. Please resend it from the verification page.",
			},
			{ status: 200 },
		);
	}

	return data({ success: true, email });
};
