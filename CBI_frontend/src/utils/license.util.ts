/**
 * Philippine Driver's License Validation & Formatting Utility
 *
 * Required format: A12-34-567890
 * - 1 uppercase letter (A-Z)
 * - 2 digits (0-9)
 * - Hyphen (-)
 * - 2 digits (0-9)
 * - Hyphen (-)
 * - 6 digits (0-9)
 * - Total length: exactly 13 characters
 */

export const DRIVER_LICENSE_REGEX = /^[A-Z][0-9]{2}-[0-9]{2}-[0-9]{6}$/;

export const DRIVER_LICENSE_ERROR_MSG =
  "Invalid Driver\u2019s License Number. Please use the format A12-34-567890.";

export interface LicenseValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates a driver's license number against the required standard format A12-34-567890.
 */
export function validateDriverLicense(value: string | null | undefined): LicenseValidationResult {
  if (!value || typeof value !== 'string') {
    return {
      isValid: false,
      error: DRIVER_LICENSE_ERROR_MSG,
    };
  }

  const trimmed = value.trim();

  // Strict regex match: exactly 1 uppercase letter, 2 digits, hyphen, 2 digits, hyphen, 6 digits
  if (!DRIVER_LICENSE_REGEX.test(trimmed)) {
    return {
      isValid: false,
      error: DRIVER_LICENSE_ERROR_MSG,
    };
  }

  return { isValid: true };
}

/**
 * Automatically formats and cleans the driver's license input:
 * 1. Capitalizes letters.
 * 2. Only allows 1 leading uppercase letter, followed by digits and hyphens.
 * 3. Automatically inserts hyphens after position 3 (A12-) and position 6 (A12-34-).
 * 4. Strictly prevents typing/pasting beyond the maximum 13 characters (A12-34-567890).
 */
export function formatDriverLicense(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') return '';

  let cleaned = input.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (cleaned.length > 0 && !/^[A-Z]/.test(cleaned)) {
    cleaned = cleaned.replace(/^[^A-Z]+/, '');
    if (!cleaned) return '';
  }

  const firstChar = cleaned.charAt(0);
  const remainingRaw = cleaned.slice(1).replace(/[^0-9]/g, '').slice(0, 10);

  let formatted = firstChar;
  if (remainingRaw.length > 0) {
    formatted += remainingRaw.slice(0, 2);
  }
  if (remainingRaw.length > 2) {
    formatted += '-' + remainingRaw.slice(2, 4);
  } else if (remainingRaw.length === 2 && input.endsWith('-')) {
    formatted += '-';
  }

  if (remainingRaw.length > 4) {
    formatted += '-' + remainingRaw.slice(4, 10);
  } else if (remainingRaw.length === 4 && input.endsWith('-')) {
    formatted += '-';
  }

  return formatted.slice(0, 13);
}
