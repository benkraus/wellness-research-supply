import { Button, Section, Text } from "@react-email/components";
import { Base } from "./base";

export const WELCOME = "welcome";

export interface WelcomeEmailProps {
	firstName: string;
	actionUrl: string;
	preview?: string;
}

export const isWelcomeData = (data: unknown): data is WelcomeEmailProps =>
	typeof data === "object" &&
	data !== null &&
	"firstName" in data &&
	"actionUrl" in data &&
	typeof (data as { firstName?: unknown }).firstName === "string" &&
	typeof (data as { actionUrl?: unknown }).actionUrl === "string";

export const WelcomeEmail = ({
	firstName,
	actionUrl,
	preview = "Welcome to Wellness Research Supply",
}: WelcomeEmailProps) => {
	return (
		<Base preview={preview}>
			<Section className="text-center mt-8">
				<Text className="text-brand-text text-xl font-bold mb-4">
					Welcome, {firstName}.
				</Text>
				<Text className="text-brand-text text-base leading-6 mb-6">
					Thank you for joining Wellness Research Supply. Your account has been
					successfully created.
				</Text>
				<Text className="text-brand-muted text-sm leading-6 mb-8">
					We are dedicated to providing premium research supplies with clinical
					precision. Explore our catalog to discover our latest offerings.
				</Text>

				<Section className="mb-8">
					<Button
						className="bg-brand-aqua rounded text-brand-ink text-sm font-semibold no-underline px-6 py-4"
						href={actionUrl}
					>
						Explore Catalog
					</Button>
				</Section>

				<Text className="text-brand-muted text-xs">
					If you have any questions, our support team is ready to assist you.
				</Text>
			</Section>
		</Base>
	);
};

WelcomeEmail.PreviewProps = {
	firstName: "Researcher",
	actionUrl: "https://wellnessresearchsupply.com/store",
	preview: "Welcome to Wellness Research Supply",
} as WelcomeEmailProps;

export default WelcomeEmail;
