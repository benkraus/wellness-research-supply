import type { ReactNode } from "react";
import { MedusaError } from "@medusajs/framework/utils";
import {
	EMAIL_VERIFICATION,
	EmailVerificationTemplate,
	isEmailVerificationData,
} from "./email-verification";
import { INVITE_USER, InviteUserEmail, isInviteUserData } from "./invite-user";
import {
	ORDER_PLACED,
	OrderPlacedTemplate,
	isOrderPlacedTemplateData,
} from "./order-placed";
import {
	PASSWORD_CHANGED,
	PasswordChangedTemplate,
	isPasswordChangedData,
} from "./password-changed";
import {
	RESET_PASSWORD,
	ResetPasswordTemplate,
	isResetPasswordData,
} from "./reset-password";
import { WELCOME, WelcomeEmail, isWelcomeData } from "./welcome";

export const EmailTemplates = {
	INVITE_USER,
	ORDER_PLACED,
	WELCOME,
	EMAIL_VERIFICATION,
	RESET_PASSWORD,
	PASSWORD_CHANGED,
} as const;

export type EmailTemplateType = keyof typeof EmailTemplates;

export function generateEmailTemplate(
	templateKey: string,
	data: unknown,
): ReactNode {
	switch (templateKey) {
		case EmailTemplates.INVITE_USER:
			if (!isInviteUserData(data)) {
				throw new MedusaError(
					MedusaError.Types.INVALID_DATA,
					`Invalid data for template "${EmailTemplates.INVITE_USER}"`,
				);
			}
			return <InviteUserEmail {...data} />;

		case EmailTemplates.ORDER_PLACED:
			if (!isOrderPlacedTemplateData(data)) {
				throw new MedusaError(
					MedusaError.Types.INVALID_DATA,
					`Invalid data for template "${EmailTemplates.ORDER_PLACED}"`,
				);
			}
			return <OrderPlacedTemplate {...data} />;

		case EmailTemplates.WELCOME:
			if (!isWelcomeData(data)) {
				throw new MedusaError(
					MedusaError.Types.INVALID_DATA,
					`Invalid data for template "${EmailTemplates.WELCOME}"`,
				);
			}
			return <WelcomeEmail {...data} />;

		case EmailTemplates.EMAIL_VERIFICATION:
			if (!isEmailVerificationData(data)) {
				throw new MedusaError(
					MedusaError.Types.INVALID_DATA,
					`Invalid data for template "${EmailTemplates.EMAIL_VERIFICATION}"`,
				);
			}
			return <EmailVerificationTemplate {...data} />;

		case EmailTemplates.RESET_PASSWORD:
			if (!isResetPasswordData(data)) {
				throw new MedusaError(
					MedusaError.Types.INVALID_DATA,
					`Invalid data for template "${EmailTemplates.RESET_PASSWORD}"`,
				);
			}
			return <ResetPasswordTemplate {...data} />;

		case EmailTemplates.PASSWORD_CHANGED:
			if (!isPasswordChangedData(data)) {
				throw new MedusaError(
					MedusaError.Types.INVALID_DATA,
					`Invalid data for template "${EmailTemplates.PASSWORD_CHANGED}"`,
				);
			}
			return <PasswordChangedTemplate {...data} />;

		default:
			throw new MedusaError(
				MedusaError.Types.INVALID_DATA,
				`Unknown template key: "${templateKey}"`,
			);
	}
}

export {
	EmailVerificationTemplate,
	InviteUserEmail,
	OrderPlacedTemplate,
	PasswordChangedTemplate,
	ResetPasswordTemplate,
	WelcomeEmail,
};
