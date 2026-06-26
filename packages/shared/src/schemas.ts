import { z } from 'zod';

export const idSchema = z.string().cuid();
export const dateStringSchema = z.string().datetime();

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  sortBy: z.string().trim().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const authLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const authUserSchema = z.object({
  id: idSchema,
  branchId: idSchema.nullable(),
  name: z.string(),
  email: z.string().email(),
  avatarUrl: z.string().url().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']),
  lastLoginAt: z.string().datetime().nullable(),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
});

export const churchSchema = z.object({
  id: idSchema,
  name: z.string().min(2),
  logoUrl: z.string().url().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  website: z.string().url().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  createdAt: dateStringSchema,
  updatedAt: dateStringSchema,
});

export const branchSchema = z.object({
  id: idSchema,
  churchId: idSchema,
  name: z.string().min(2),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().email().nullable(),
  pastorName: z.string().nullable(),
  isMainBranch: z.boolean(),
  createdAt: dateStringSchema,
  updatedAt: dateStringSchema,
});

export const personSchema = z.object({
  id: idSchema,
  branchId: idSchema,
  firstName: z.string().min(1),
  middleName: z.string().nullable(),
  lastName: z.string().min(1),
  preferredName: z.string().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).nullable(),
  dateOfBirth: z.string().date().nullable(),
  phone: z.string().nullable(),
  email: z.string().email().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  occupation: z.string().nullable(),
  profilePhotoUrl: z.string().url().nullable(),
  notes: z.string().nullable(),
  whatsappNumber: z.string().nullable(),
  allowSms: z.boolean(),
  allowBirthdaySms: z.boolean(),
  allowEventSms: z.boolean(),
  allowWelfareSms: z.boolean(),
  allowWhatsApp: z.boolean(),
  allowBirthdayWhatsApp: z.boolean(),
  preferredCommunicationChannel: z.enum(['SMS', 'WHATSAPP', 'BOTH', 'NONE']),
  doNotContact: z.boolean(),
  createdAt: dateStringSchema,
  updatedAt: dateStringSchema,
});

const optionalText = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().optional(),
);

const optionalEmail = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().email().optional(),
);

const optionalDate = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().optional(),
);

const optionalBoolean = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['yes', 'true', '1', 'y'].includes(normalized)) return true;
  if (['no', 'false', '0', 'n'].includes(normalized)) return false;
  return value;
}, z.boolean().optional());

export const peopleQuerySchema = paginationQuerySchema.extend({
  status: z.string().trim().optional(),
  classification: z.string().trim().optional(),
});

export const createPersonSchema = z.object({
  title: optionalText,
  firstName: z.string().trim().min(1, 'First name is required'),
  middleName: optionalText,
  lastName: z.string().trim().min(1, 'Last name is required'),
  suffix: optionalText,
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional().nullable(),
  dateOfBirth: optionalDate.nullable(),
  hideAge: z.boolean().default(false),
  familyId: optionalText.nullable(),
  familyRole: optionalText,
  homePhone: optionalText,
  mobilePhone: optionalText,
  workPhone: optionalText,
  phone: optionalText,
  email: optionalEmail,
  otherEmail: optionalEmail,
  address: optionalText,
  occupation: optionalText,
  facebook: optionalText,
  x: optionalText,
  linkedin: optionalText,
  classification: optionalText,
  membershipDate: optionalDate.nullable(),
  friendDate: optionalDate.nullable(),
  departmentId: optionalText,
  departmentPosition: optionalText,
  departmentRoleType: z.enum(['HEAD', 'MEMBER']).optional(),
  whatsappNumber: optionalText,
  allowSms: z.boolean().default(true),
  allowBirthdaySms: z.boolean().default(true),
  allowEventSms: z.boolean().default(true),
  allowWelfareSms: z.boolean().default(true),
  allowWhatsApp: z.boolean().default(false),
  allowBirthdayWhatsApp: z.boolean().default(false),
  preferredCommunicationChannel: z.enum(['SMS', 'WHATSAPP', 'BOTH', 'NONE']).default('SMS'),
  doNotContact: z.boolean().default(false),
  notes: optionalText,
});

export const importPeopleRowSchema = z
  .object({
    firstName: optionalText,
    middleName: optionalText,
    lastName: optionalText,
    fullName: optionalText,
    gender: optionalText,
    dateOfBirth: optionalDate,
    phone: optionalText,
    email: optionalEmail,
    address: optionalText,
    familyName: optionalText,
    classification: optionalText,
    occupation: optionalText,
    membershipDate: optionalDate,
    department: optionalText,
    whatsappNumber: optionalText,
    preferredCommunicationChannel: z.enum(['SMS', 'WHATSAPP', 'BOTH', 'NONE']).optional(),
    allowSms: optionalBoolean,
    allowBirthdaySms: optionalBoolean,
    allowWhatsApp: optionalBoolean,
    allowBirthdayWhatsApp: optionalBoolean,
    doNotContact: optionalBoolean,
    notes: optionalText,
  })
  .refine((row) => Boolean(row.fullName || (row.firstName && row.lastName)), {
    message: 'First and last name are required unless full name is supplied',
  });

export const importPeopleSchema = z.object({
  rows: z.array(importPeopleRowSchema).min(1, 'Import requires at least one row'),
});

export const memberSchema = z.object({
  id: idSchema,
  personId: idSchema,
  membershipNumber: z.string().min(2),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED', 'VISITOR']),
  joinedAt: z.string().date().nullable(),
  membershipType: z.enum(['BAPTIZED', 'UNBAPTIZED', 'TRANSFER', 'OTHER']),
  baptismStatus: z.enum(['BAPTIZED', 'NOT_BAPTIZED', 'PENDING']).nullable(),
  maritalStatus: z.enum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'SEPARATED']).nullable(),
  emergencyContactName: z.string().nullable(),
  emergencyContactPhone: z.string().nullable(),
  createdAt: dateStringSchema,
  updatedAt: dateStringSchema,
});

export const familySchema = z.object({
  id: idSchema,
  branchId: idSchema,
  familyName: z.string().min(2),
  address: z.string().nullable(),
  primaryPhone: z.string().nullable(),
  primaryEmail: z.string().email().nullable(),
  createdAt: dateStringSchema,
  updatedAt: dateStringSchema,
});

export const groupSchema = z.object({
  id: idSchema,
  branchId: idSchema,
  name: z.string().min(2),
  type: z.enum(['MINISTRY', 'DEPARTMENT', 'CELL', 'SMALL_GROUP', 'OTHER']),
  description: z.string().nullable(),
  leaderId: idSchema.nullable(),
  meetingDay: z.string().nullable(),
  meetingTime: z.string().nullable(),
  location: z.string().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']),
  createdAt: dateStringSchema,
  updatedAt: dateStringSchema,
});

export const eventSchema = z.object({
  id: idSchema,
  branchId: idSchema,
  title: z.string().min(2),
  description: z.string().nullable(),
  eventType: z.enum(['SERVICE', 'MEETING', 'CONFERENCE', 'OUTREACH', 'YOUTH', 'OTHER']),
  startDateTime: dateStringSchema,
  endDateTime: dateStringSchema,
  location: z.string().nullable(),
  capacity: z.number().int().positive().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED']),
  createdById: idSchema.nullable(),
  createdAt: dateStringSchema,
  updatedAt: dateStringSchema,
});

export const attendanceSessionSchema = z.object({
  id: idSchema,
  branchId: idSchema,
  eventId: idSchema.nullable(),
  title: z.string(),
  sessionDate: z.string().date(),
  checkInMode: z.enum(['MANUAL', 'KIOSK', 'QR', 'SELF']),
  createdById: idSchema.nullable(),
  createdAt: dateStringSchema,
  updatedAt: dateStringSchema,
});

export const contributionSchema = z.object({
  id: idSchema,
  branchId: idSchema,
  personId: idSchema.nullable(),
  fundId: idSchema.nullable(),
  type: z.enum(['TITHE', 'OFFERING', 'DONATION', 'SEED', 'OTHER']),
  amount: z.number().nonnegative(),
  currency: z.string().length(3),
  paymentMethod: z.enum(['CASH', 'CARD', 'BANK_TRANSFER', 'MOBILE_MONEY', 'OTHER']),
  reference: z.string().nullable(),
  contributionDate: z.string().date(),
  receivedById: idSchema.nullable(),
  notes: z.string().nullable(),
  createdAt: dateStringSchema,
  updatedAt: dateStringSchema,
});

export const expenseSchema = z.object({
  id: idSchema,
  branchId: idSchema,
  category: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  amount: z.number().nonnegative(),
  currency: z.string().length(3),
  paymentMethod: z.enum(['CASH', 'CARD', 'BANK_TRANSFER', 'MOBILE_MONEY', 'OTHER']),
  expenseDate: z.string().date(),
  requestedById: idSchema.nullable(),
  approvedById: idSchema.nullable(),
  status: z.enum(['PENDING', 'APPROVED', 'PAID', 'REJECTED']),
  receiptUrl: z.string().url().nullable(),
  createdAt: dateStringSchema,
  updatedAt: dateStringSchema,
});

export const dashboardSummarySchema = z.object({
  cards: z.object({
    totalPeople: z.number().int(),
    newPeopleThisMonth: z.number().int(),
    totalAttendance: z.number().int(),
    netBalance: z.number(),
  }),
  charts: z.object({
    weeklyAttendanceTrend: z.array(z.object({
      label: z.string(),
      mainService: z.number(),
      childrenService: z.number(),
      total: z.number(),
    })),
    monthlyFinanceFlow: z.array(z.object({
      label: z.string(),
      welfareCollected: z.number(),
      fundContributions: z.number(),
      expenses: z.number(),
      netBalance: z.number(),
    })),
  }),
  recentActivities: z.array(z.object({
    id: idSchema,
    title: z.string(),
    description: z.string().nullable(),
    type: z.string(),
    createdAt: dateStringSchema,
  })).optional(),
});

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;
export type AuthLoginInput = z.infer<typeof authLoginSchema>;
export type CreatePersonInput = z.infer<typeof createPersonSchema>;
export type ImportPeopleRowInput = z.infer<typeof importPeopleRowSchema>;
