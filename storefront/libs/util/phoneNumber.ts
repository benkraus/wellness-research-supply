export type FormatPhoneNumberMask = 'default' | 'dots' | 'dashes' | 'uri';

export type FormatPhoneNumberCountryCode = 'US';

export interface FormatPhoneNumberOptions {
  format: FormatPhoneNumberMask;
  countryCode: FormatPhoneNumberCountryCode;
  customMask?: string;
}

export interface NormalizePhoneNumberOptions {
  defaultCountryCode?: FormatPhoneNumberCountryCode;
}

/**
 * Assists with applying different formats dynamically to a given phone number.
 * We provide default masks which can be used via the `format` and `countryCode`
 * options, or a consumer may pass in a `customMask`.
 *
 * @param phoneNumber string
 * @param options object
 * @return string
 */
export const formatPhoneNumber = (phoneNumber: string, options?: Partial<FormatPhoneNumberOptions>) => {
  return phoneNumber;
};

const formatUsPhoneDigits = (digits: string) => {
  if (!digits) return '';

  const area = digits.slice(0, 3);
  const prefix = digits.slice(3, 6);
  const line = digits.slice(6, 10);
  const extension = digits.slice(10);

  if (digits.length <= 3) return area;
  if (digits.length <= 6) return `(${area}) ${prefix}`;
  if (digits.length <= 10) return `(${area}) ${prefix}-${line}`;

  return `(${area}) ${prefix}-${line} ${extension}`;
};

export const formatPhoneNumberInput = (value: string) => {
  const raw = value.trim();
  if (!raw) return '';

  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  if (raw.startsWith('+')) {
    if (digits.startsWith('1')) {
      const formatted = formatUsPhoneDigits(digits.slice(1));
      return formatted ? `+1 ${formatted}` : '+1';
    }

    return `+${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return formatUsPhoneDigits(digits.slice(1));
  }

  return formatUsPhoneDigits(digits);
};

export const applyPhoneInputFormatting = (input: HTMLInputElement) => {
  const formatted = formatPhoneNumberInput(input.value);
  if (!formatted || formatted === input.value) return;

  input.value = formatted;
  if (typeof input.setSelectionRange === 'function') {
    const end = formatted.length;
    try {
      input.setSelectionRange(end, end);
    } catch {
      // Ignore selection errors for non-text inputs.
    }
  }
};

export const normalizePhoneNumber = (
  phoneNumber: string,
  options?: NormalizePhoneNumberOptions,
): string | null => {
  const raw = phoneNumber.trim();
  if (!raw) return null;

  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  const defaultCountry = options?.defaultCountryCode ?? 'US';

  if (raw.startsWith('+')) {
    return `+${digits}`;
  }

  if (defaultCountry === 'US') {
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }

    if (digits.length === 10) {
      return `+1${digits}`;
    }
  }

  return `+${digits}`;
};
