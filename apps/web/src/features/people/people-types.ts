export type PersonRecord = {
  id: string;
  title?: string | null;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  suffix?: string | null;
  email?: string | null;
  phone?: string | null;
  mobilePhone?: string | null;
  dateOfBirth?: string | null;
  classification?: string | null;
  createdAt: string;
  deletedAt?: string | null;
  familyMembers?: Array<{ family?: { familyName?: string | null } | null }>;
  member?: { membershipNumber?: string | null } | null;
};

export type PeopleListResponse = {
  items: PersonRecord[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type ImportResult = {
  totalRows: number;
  imported?: number;
  created?: number;
  updated?: number;
  skipped: number;
  duplicates?: number;
  errors: Array<{ row: number; message: string }>;
};

export type ImportPreviewRow = {
  rowNumber: number;
  rawData: unknown;
  data: Record<string, unknown> | null;
  status: 'ready' | 'duplicate' | 'error';
  duplicateReason?: string;
  matchingPersonId?: string;
  matchingPersonName?: string;
  matchingField?: string;
  selectedAction: 'skip' | 'create' | 'update' | 'importAnyway';
  errorMessage?: string;
};

export type ImportPreviewResult = {
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  errorRows: number;
  readyRows: number;
  rows: ImportPreviewRow[];
  warnings?: string[];
};
