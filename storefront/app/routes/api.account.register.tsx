import { baseMedusaConfig, getPublishableKey, sdk } from "@libs/util/server/client.server";
import { setAuthToken } from "@libs/util/server/cookies.server";
import { data } from "react-router";
import { normalizePhoneNumber } from "@libs/util/phoneNumber";

export const action = async ({ request }: { request: Request }) => {
	const MIN_PASSWORD_LENGTH = 10;
	const formData = await request.formData();
	const email = String(formData.get("email") || "").trim();
	const password = String(formData.get("password") || "").trim();
	const firstName = String(formData.get("first_name") || "").trim();
	const lastName = String(formData.get("last_name") || "").trim();
	const phone = String(formData.get("phone") || "").trim();
	const normalizedPhone = normalizePhoneNumber(phone);

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

	let token: string | undefined;
	const publishableKey = (await getPublishableKey()) ?? "";

	const reclaimIdentity = async () => {
		const reclaimResponse = await fetch(
			new URL("/store/account/reclaim-identity", baseMedusaConfig.baseUrl),
			{
				method: "POST",
				headers: {
					"content-type": "application/json",
					"x-publishable-api-key": publishableKey,
				},
				body: JSON.stringify({ email }),
			},
		);

		if (reclaimResponse.status === 409) {
			return { blocked: true } as const;
		}

		return { blocked: false } as const;
	};

	const preflight = await reclaimIdentity();
	if (preflight.blocked) {
		return data(
			{ error: "That email is already in use. Please sign in instead." },
			{ status: 409 },
		);
	}

	try {
		const registerResponse = await sdk.auth.register("customer", "emailpass", {
			email,
			password,
		});
		token = typeof registerResponse === "string" ? registerResponse : undefined;
	} catch (error) {
		const message = String(error);

		if (message.includes("Identity with email already exists")) {
			const reclaimResult = await reclaimIdentity();
			if (reclaimResult.blocked) {
				return data(
					{ error: "That email is already in use. Please sign in instead." },
					{ status: 409 },
				);
			}

			try {
				const registerResponse = await sdk.auth.register("customer", "emailpass", {
					email,
					password,
				});
				token = typeof registerResponse === "string" ? registerResponse : undefined;
			} catch {
				return data(
					{ error: "Registration failed. Please try again." },
					{ status: 400 },
				);
			}
		} else {
			return data(
				{ error: "Registration failed. Please try again." },
				{ status: 400 },
			);
		}
	}

	if (!token) {
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
			phone: normalizedPhone || undefined,
		},
		{},
		{
			Authorization: `Bearer ${token}`,
		},
	);

	return data({ success: true, email }, { headers });
};
