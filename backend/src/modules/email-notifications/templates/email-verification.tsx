import { Button, Hr, Link, Section, Text } from "@react-email/components";
import { Base } from "./base";

export const EMAIL_VERIFICATION = "email-verification";

export interface EmailVerificationProps {
	verificationLink: string;
	preview?: string;
}

export const isEmailVerificationData = (
	data: unknown,
): data is EmailVerificationProps =>
	typeof data === "object" &&
	data !== null &&
	"verificationLink" in data &&
	typeof (data as { verificationLink?: unknown }).verificationLink === "string";

export const EmailVerificationTemplate = ({
	verificationLink,
	preview = "Verify your email address",
}: EmailVerificationProps) => {
	return (
		<Base preview={preview}>
			<Section className="text-center mt-8">
				<Text className="text-brand-text text-xl font-bold mb-4">
					Verify Your Email
				</Text>
				<Text className="text-brand-text text-base leading-6 mb-8">
					Please confirm your email address to complete your registration and
					access your Wellness Research Supply account.
				</Text>

				<Section className="mb-8">
					<Button
						className="email-button bg-brand-aqua rounded text-brand-ink text-sm font-semibold no-underline px-6 py-4"
						href={verificationLink}
					>
						Verify Email
					</Button>
				</Section>

				<Text className="text-brand-muted text-sm mb-2">
					Or copy and paste this link into your browser:
				</Text>
				<Text
					style={{
						maxWidth: "100%",
						wordBreak: "break-all",
						overflowWrap: "break-word",
					}}
				>
					<Link
						href={verificationLink}
						className="text-brand-teal no-underline hover:text-brand-mint text-xs"
					>
						{verificationLink}
					</Link>
				</Text>

				<Hr className="border-brand-teal/20 my-8" />

				<Text className="text-brand-muted text-xs">
					If you did not create an account with Wellness Research Supply, please
					ignore this email.
				</Text>
			</Section>
		</Base>
	);
};

EmailVerificationTemplate.PreviewProps = {
	verificationLink:
		"https://wellnessresearchsupply.com/auth/verify?token=abc123xyz",
	preview: "Verify your email address",
} as EmailVerificationProps;

export default EmailVerificationTemplate;
