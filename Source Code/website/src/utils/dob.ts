/**
 * Shared Date-of-Birth validation and formatting utilities.
 * Used by Onboarding and Account pages.
 */

/** Validate a DOB string in MM/DD/YYYY format */
export function isValidDob(dobStr: string): boolean {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dobStr)) return false;
  const [mm, dd, yyyy] = dobStr.split("/");
  const month = parseInt(mm, 10);
  const day = parseInt(dd, 10);
  const year = parseInt(yyyy, 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const currentYear = new Date().getFullYear();
  if (year < 1900 || year > currentYear) return false;

  const daysInMonth = new Date(year, month, 0).getDate();
  if (day > daysInMonth) return false;

  return true;
}

/** Auto-format a raw input value into MM/DD/YYYY as the user types */
export function formatDobInput(rawValue: string): string {
  let val = rawValue.replace(/\D/g, "");
  if (val.length >= 2) {
    val = val.slice(0, 2) + "/" + val.slice(2);
  }
  if (val.length >= 5) {
    val = val.slice(0, 5) + "/" + val.slice(5, 9);
  }
  return val;
}
