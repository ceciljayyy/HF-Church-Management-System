export type PersonSummary = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  mobilePhone?: string | null;
};

export type DepartmentMembership = {
  id: string;
  role?: string | null;
  status?: string | null;
  joinedAt: string;
  person: PersonSummary;
  group?: DepartmentRecord;
};

export type DepartmentRecord = {
  id: string;
  name: string;
  description?: string | null;
  meetingDay?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  leader?: PersonSummary | null;
  members?: DepartmentMembership[];
  _count?: { members: number };
};

export type Paginated<T> = {
  items: T[];
  departments?: DepartmentRecord[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
