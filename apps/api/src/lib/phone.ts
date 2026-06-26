export function normalizeGhanaPhone(phone?: string | null) {
  const raw = (phone ?? '').trim();
  if (!raw) return null;
  let digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('233') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 10) return `+233${digits.slice(1)}`;
  if (digits.length === 9) return `+233${digits}`;
  return null;
}

export function isValidGhanaPhone(phone?: string | null) {
  return Boolean(normalizeGhanaPhone(phone));
}
