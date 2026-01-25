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
	const storeBaseUrl = (() => {
		const storeOrigins =
			process.env.STORE_CORS?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [];
		const firstOrigin = storeOrigins[0];
		const backendUrl =
			process.env.BACKEND_PUBLIC_URL ??
			process.env.RAILWAY_PUBLIC_DOMAIN_VALUE ??
			"http://localhost:9000";
		return firstOrigin ?? process.env.STOREFRONT_URL ?? backendUrl;
	})();

	const logoUrl = (() => {
		try {
			return new URL("/assets/brand/wrs-gradient.svg", storeBaseUrl).toString();
		} catch {
			return "https://wellnessresearchsupply.com/assets/brand/wrs-gradient.svg";
		}
	})();

	return (
		<Html>
			<Head>
				<style>
					{`
            @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&display=swap');
          `}
				</style>
			</Head>
			<Preview>{preview}</Preview>
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
				<Body className="bg-brand-dark my-auto mx-auto font-sans px-2 text-brand-text">
					<Container className="border border-solid border-brand-teal/20 rounded my-[40px] mx-auto p-[20px] max-w-[465px] w-full overflow-hidden bg-brand-subtle">
						<div className="mb-8 text-center">
							<img
								src={logoUrl}
								alt="Wellness Research Supply"
								className="mx-auto"
								width="160"
								height="40"
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
