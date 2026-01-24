import { Button, Hr, Link, Section, Text } from "@react-email/components";
import { Base } from "./base";

/**
 * The key for the InviteUserEmail template, used to identify it
 */
export const INVITE_USER = "invite-user";

/**
 * The props for the InviteUserEmail template
 */
export interface InviteUserEmailProps {
	/**
	 * The link that the user can click to accept the invitation
	 */
	inviteLink: string;
	/**
	 * The preview text for the email, appears next to the subject
	 * in mail providers like Gmail
	 */
	preview?: string;
}

/**
 * Type guard for checking if the data is of type InviteUserEmailProps
 * @param data - The data to check
 */
export const isInviteUserData = (data: unknown): data is InviteUserEmailProps =>
	typeof data === "object" &&
	data !== null &&
	"inviteLink" in data &&
	typeof (data as { inviteLink?: unknown }).inviteLink === "string" &&
	(typeof (data as { preview?: unknown }).preview === "string" ||
		!(data as { preview?: unknown }).preview);

/**
 * The InviteUserEmail template component built with react-email
 */
export const InviteUserEmail = ({
	inviteLink,
	preview = `You've been invited to Wellness Research Supply!`,
}: InviteUserEmailProps) => {
	return (
		<Base preview={preview}>
			<Section className="text-center mt-[32px]">
				<Text className="text-brand-text text-[16px] leading-[24px]">
					You&apos;ve been invited to be an administrator on{" "}
					<strong>Wellness Research Supply</strong>.
				</Text>
				<Section className="mt-8 mb-[32px]">
					<Button
						className="bg-brand-aqua rounded text-brand-ink text-[14px] font-semibold no-underline px-6 py-4"
						href={inviteLink}
					>
						Accept Invitation
					</Button>
				</Section>
				<Text className="text-brand-muted text-[14px] leading-[24px]">
					or copy and paste this URL into your browser:
				</Text>
				<Text
					style={{
						maxWidth: "100%",
						wordBreak: "break-all",
						overflowWrap: "break-word",
					}}
				>
					<Link
						href={inviteLink}
						className="text-brand-teal no-underline hover:text-brand-mint"
					>
						{inviteLink}
					</Link>
				</Text>
			</Section>
			<Hr className="border border-solid border-brand-teal/20 my-[26px] mx-0 w-full" />
			<Text className="text-brand-muted text-[12px] leading-[24px]">
				If you were not expecting this invitation, you can ignore this email, as
				the invitation will expire in 24 hours. If you are concerned about your
				account's safety, please reply to this email to get in touch with us.
			</Text>
		</Base>
	);
};

InviteUserEmail.PreviewProps = {
	inviteLink:
		"https://mywebsite.com/app/invite?token=abc123ddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
} as InviteUserEmailProps;

export default InviteUserEmail;
