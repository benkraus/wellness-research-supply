import { Hr, Link, Section, Text } from "@react-email/components";
import { Base } from "./base";

export const PASSWORD_CHANGED = "password-changed";

export interface PasswordChangedProps {
	contactUrl: string;
	preview?: string;
}

export const isPasswordChangedData = (
	data: unknown,
): data is PasswordChangedProps =>
	typeof data === "object" &&
	data !== null &&
	"contactUrl" in data &&
	typeof (data as { contactUrl?: unknown }).contactUrl === "string";

export const PasswordChangedTemplate = ({
	contactUrl,
	preview = "Your password has been changed",
}: PasswordChangedProps) => {
	return (
		<Base preview={preview}>
			<Section className="text-center mt-8">
				<Text className="text-brand-text text-xl font-bold mb-4">
					Password Changed
				</Text>
				<Text className="text-brand-text text-base leading-6 mb-8">
					The password for your Wellness Research Supply account has been
					successfully changed.
				</Text>

				<Hr className="border-brand-teal/20 my-8" />

				<Text className="text-brand-muted text-xs mb-2">
					If you did not make this change, please contact our support team
					immediately.
				</Text>
				<Link
					href={contactUrl}
					className="text-brand-teal text-sm font-semibold no-underline hover:text-brand-mint"
				>
					Contact Support
				</Link>
			</Section>
		</Base>
	);
};

PasswordChangedTemplate.PreviewProps = {
	contactUrl: "https://wellnessresearchsupply.com/support",
	preview: "Your password has been changed",
} as PasswordChangedProps;

export default PasswordChangedTemplate;
