import {
	Body,
	Container,
	Head,
	Html,
	Preview,
	Tailwind,
} from "@react-email/components";
import type { ReactNode } from "react";

interface BaseProps {
	preview?: string;
	children: ReactNode;
}

export const Base = ({ preview, children }: BaseProps) => {
	const defaultStorefrontBaseUrl =
		process.env.EMAIL_STOREFRONT_BASE_URL?.trim() ||
		"https://storefront-production-3cb7.up.railway.app";

	const storeBaseUrl = (() => {
		const storeOrigins =
			process.env.STORE_CORS?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [];
		const storefrontUrl = process.env.STOREFRONT_URL?.trim() || undefined;
		const nonLocalOrigins = storeOrigins.filter(
			(origin) => !origin.includes("localhost") && !origin.includes("127.0.0.1"),
		);
		const firstOrigin = nonLocalOrigins[0] ?? storeOrigins[0];
		const backendUrl =
			process.env.BACKEND_PUBLIC_URL ??
			process.env.RAILWAY_PUBLIC_DOMAIN_VALUE ??
			"http://localhost:9000";
		const candidate = storefrontUrl ?? firstOrigin ?? backendUrl;

		try {
			const host = new URL(candidate).host;
			const isLocal =
				host.includes("localhost") ||
				host.includes("127.0.0.1") ||
				host.endsWith(".internal") ||
				host.includes("railway.internal");
			if (isLocal) {
				return defaultStorefrontBaseUrl;
			}
			return candidate;
		} catch {
			return defaultStorefrontBaseUrl;
		}
	})();

	const logoUrl = (() => {
		const explicit = process.env.EMAIL_LOGO_URL?.trim();
		if (explicit) {
			return explicit;
		}

		const fallback = new URL("/assets/brand/wrs-gradient.png", defaultStorefrontBaseUrl).toString();

		try {
			const host = new URL(storeBaseUrl).host;
			const isLocal =
				host.includes("localhost") ||
				host.includes("127.0.0.1") ||
				host.endsWith(".internal") ||
				host.includes("railway.internal");
			if (isLocal) {
				return fallback;
			}
			return new URL("/assets/brand/wrs-gradient.png", storeBaseUrl).toString();
		} catch {
			return fallback;
		}
	})();

	return (
		<Html>
			<Tailwind
				config={{
					theme: {
						extend: {
							colors: {
								brand: {
									ink: "#062B45",
									aqua: "#21CFE0",
									teal: "#2FE6C5",
									mint: "#B8F7AE",
									dark: "#041B2B",
									subtle: "#062132",
									text: "#F0FDFA",
									muted: "#5FAFB9",
								},
							},
							fontFamily: {
								sans: ["Montserrat", "sans-serif"],
							},
						},
					},
				}}
			>
				<Head>
					<meta name="viewport" content="width=device-width, initial-scale=1" />
					<style>
						{`
            @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&display=swap');

            @media only screen and (max-width: 600px) {
              .email-body {
                padding-left: 8px !important;
                padding-right: 8px !important;
              }

              .email-container {
                max-width: 100% !important;
                width: 100% !important;
                margin: 24px auto !important;
                padding: 16px !important;
                border-radius: 16px !important;
              }

              .email-button {
                display: block !important;
                width: 100% !important;
              }
            }
          `}
					</style>
				</Head>
				<Preview>{preview}</Preview>
				<Body className="email-body bg-brand-dark my-auto mx-auto font-sans px-2 text-brand-text">
					<Container className="email-container border border-solid border-brand-teal/20 rounded my-[40px] mx-auto p-[20px] max-w-[560px] w-full overflow-hidden bg-brand-subtle">
						<div className="mb-8 text-center">
						<img
								src={logoUrl}
								alt="Wellness Research Supply"
								className="mx-auto"
								width="220"
								height="36"
							/>
							<div className="h-1 w-full bg-gradient-to-r from-brand-aqua/20 via-brand-teal to-brand-aqua/20 mt-4 rounded-full opacity-50" />
						</div>
						<div className="max-w-full break-words text-brand-text">
							{children}
						</div>
						<div className="mt-8 text-center text-brand-muted text-xs">
							<p>
								&copy; {new Date().getFullYear()} Wellness Research Supply. All
								rights reserved.
							</p>
						</div>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
};
