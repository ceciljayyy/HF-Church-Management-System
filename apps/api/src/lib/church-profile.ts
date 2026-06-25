import { z } from 'zod';
import { Prisma } from '@prisma/client';

const optionalText = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => value || null);

const optionalUrl = optionalText.refine(
  (value) => !value || /^https?:\/\/.+\..+/.test(value),
  'Website must be a valid URL.',
);

const optionalEmail = optionalText.refine(
  (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  'Email must be valid.',
);

const optionalNumber = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  });

export const churchProfileSchema = z.object({
  churchName: z.string().trim().min(1, 'Church name is required.'),
  branchName: optionalText,
  denomination: optionalText,
  slogan: optionalText,
  website: optionalUrl,
  logoUrl: optionalText,
  phone: z.string().trim().min(1, 'Phone number is required.'),
  alternatePhone: optionalText,
  email: z.string().trim().email('Email must be valid.'),
  adminContactName: z.string().trim().min(1, 'Admin contact name is required.'),
  adminContactPhone: z.string().trim().min(1, 'Admin contact phone is required.'),
  adminContactEmail: optionalEmail,
  seniorPastorName: optionalText,
  streetAddress: optionalText,
  city: z.string().trim().min(1, 'City is required.'),
  stateOrRegion: optionalText,
  postalCode: optionalText,
  country: z.string().trim().min(1, 'Country is required.').default('Ghana'),
  latitude: optionalNumber.refine((value) => value === null || (value >= -90 && value <= 90), 'Latitude must be between -90 and 90.'),
  longitude: optionalNumber.refine((value) => value === null || (value >= -180 && value <= 180), 'Longitude must be between -180 and 180.'),
  mapProvider: optionalText,
  language: z.string().trim().min(1).default('English'),
  timezone: z.string().trim().min(1).default('Africa/Accra'),
  distanceUnit: z.string().trim().min(1).default('kilometers'),
  currency: z.string().trim().min(1).default('GHS'),
  dateFormat: z.string().trim().min(1).default('DD/MM/YYYY'),
  defaultCity: optionalText,
  defaultStateOrRegion: optionalText,
  defaultPostalCode: optionalText,
  defaultCountry: z.string().trim().min(1).default('Ghana'),
  defaultServiceDay: z.string().trim().min(1).default('Sunday'),
  defaultServiceTime: z.string().trim().min(1).default('09:00'),
  enableChildrenServiceAttendance: z.coerce.boolean().default(true),
  enableVehicleCount: z.coerce.boolean().default(true),
  welfareInitialPayment: z.coerce.number().min(0).default(10),
  welfareMonthlyPayment: z.coerce.number().min(0).default(5),
});

export const churchProfileDraftSchema = churchProfileSchema.partial().extend({
  churchName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email().optional(),
  adminContactName: z.string().trim().optional(),
  adminContactPhone: z.string().trim().optional(),
  city: z.string().trim().optional(),
  country: z.string().trim().optional(),
});

export const geocodeSchema = z.object({
  streetAddress: optionalText,
  city: optionalText,
  stateOrRegion: optionalText,
  postalCode: optionalText,
  country: optionalText,
});

export function toChurchProfileData(data: z.infer<typeof churchProfileSchema>) {
  return {
    ...data,
    welfareInitialPayment: new Prisma.Decimal(data.welfareInitialPayment),
    welfareMonthlyPayment: new Prisma.Decimal(data.welfareMonthlyPayment),
  };
}

export function canManageChurchProfile(session: { roles?: string[]; permissions?: string[] }) {
  const permissions = session.permissions ?? [];
  const roles = session.roles ?? [];
  return (
    permissions.includes('admin.*') ||
    permissions.includes('churchProfile.update') ||
    permissions.includes('onboarding.complete') ||
    permissions.includes('settings.updateChurchProfile') ||
    roles.some((role) => role.toLowerCase().includes('admin'))
  );
}
