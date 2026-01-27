import { Button, Hr, Link, Section, Text } from "@react-email/components";
import { Base } from "./base";

export const RESET_PASSWORD = "reset-password";

export interface ResetPasswordProps {
	resetLink: string;
	preview?: string;
}

export const isResetPasswordData = (
	data: unknown,
): data is ResetPasswordProps =>
	typeof data === "object" &&
	data !== null &&
	"resetLink" in data &&
	typeof (data as { resetLink?: unknown }).resetLink === "string";

export const ResetPasswordTemplate = ({
	resetLink,
	preview = "Reset your password",
}: ResetPasswordProps) => {
	return (
		<Base preview={preview}>
			<Section className="text-center mt-8">
				<Text className="text-brand-text text-xl font-bold mb-4">
					Reset Your Password
				</Text>
				<Text className="text-brand-text text-base leading-6 mb-8">
					We received a request to reset the password for your Wellness Research
					Supply account.
				</Text>

				<Section className="mb-8">
					<Button
						className="email-button bg-brand-aqua rounded text-brand-ink text-sm font-semibold no-underline px-6 py-4"
						href={resetLink}
					>
						Reset Password
					</Button>
				</Section>

				<Text className="text-brand-muted text-sm mb-2">Or use this link:</Text>
				<Text
					style={{
						maxWidth: "100%",
						wordBreak: "break-all",
						overflowWrap: "break-word",
					}}
				>
						<Link href={resetLink} className="text-brand-teal no-underline text-xs">
							{resetLink}
						</Link>
				</Text>

				<Hr className="border-brand-teal/20 my-8" />

				<Text className="text-brand-muted text-xs">
					If you didn't request a password reset, you can safely ignore this
					email. Your password will remain unchanged.
				</Text>
			</Section>
		</Base>
	);
};

ResetPasswordTemplate.PreviewProps = {
	resetLink:
		"https://wellnessresearchsupply.com/auth/reset-password?token=abc123xyz",
	preview: "Reset your password",
} as ResetPasswordProps;

export default ResetPasswordTemplate;
