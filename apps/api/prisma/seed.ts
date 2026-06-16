import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const password = 'Password123!';

const permissions = [
  { key: 'dashboard.read', description: 'Read dashboard', module: 'dashboard' },
  { key: 'people.read', description: 'Read people', module: 'people' },
  { key: 'people.create', description: 'Create people', module: 'people' },
  { key: 'people.import', description: 'Import people', module: 'people' },
  { key: 'people.update', description: 'Update people', module: 'people' },
  { key: 'people.archive', description: 'Archive people', module: 'people' },
  { key: 'members.read', description: 'Read members', module: 'members' },
  { key: 'members.create', description: 'Create members', module: 'members' },
  { key: 'members.update', description: 'Update members', module: 'members' },
  { key: 'members.archive', description: 'Archive members', module: 'members' },
  { key: 'families.manage', description: 'Manage families', module: 'families' },
  { key: 'groups.manage', description: 'Manage groups', module: 'groups' },
  { key: 'events.manage', description: 'Manage events', module: 'events' },
  { key: 'attendance.manage', description: 'Manage attendance', module: 'attendance' },
  { key: 'finance.read', description: 'Read finance', module: 'finance' },
  { key: 'finance.create', description: 'Create finance records', module: 'finance' },
  { key: 'finance.update', description: 'Update finance records', module: 'finance' },
  { key: 'finance.approve', description: 'Approve finance records', module: 'finance' },
  { key: 'reports.read', description: 'Read reports', module: 'reports' },
  { key: 'settings.update', description: 'Update settings', module: 'settings' },
  { key: 'churchProfile.view', description: 'View church profile', module: 'settings' },
  { key: 'churchProfile.update', description: 'Update church profile', module: 'settings' },
  { key: 'onboarding.complete', description: 'Complete onboarding', module: 'onboarding' },
  { key: 'users.manage', description: 'Manage users', module: 'admin' },
  { key: 'roles.manage', description: 'Manage roles', module: 'admin' },
  { key: 'audit.read', description: 'Read audit logs', module: 'audit' },
] as const;

const rolePermissions: Record<string, string[]> = {
  'Super Admin': permissions.map((permission) => permission.key),
  'Church Admin': permissions.map((permission) => permission.key).filter((key) => key !== 'roles.manage'),
  Pastor: [
    'dashboard.read',
    'people.read',
    'people.create',
    'people.import',
    'people.update',
    'members.read',
    'members.create',
    'members.update',
    'families.manage',
    'groups.manage',
    'events.manage',
    'attendance.manage',
    'reports.read',
  ],
  'Finance Officer': ['dashboard.read', 'finance.read', 'finance.create', 'finance.update', 'finance.approve', 'reports.read', 'audit.read'],
  'Attendance Officer': ['dashboard.read', 'people.read', 'members.read', 'events.manage', 'attendance.manage', 'reports.read'],
  'Group Leader': ['dashboard.read', 'people.read', 'members.read', 'groups.manage', 'attendance.manage'],
  Member: ['dashboard.read'],
};

async function upsertUser(branchId: string, name: string, email: string, roleId: string, passwordHash: string) {
  const user = await prisma.user.upsert({
    where: { email },
    update: { branchId, name, passwordHash, status: 'ACTIVE' },
    create: { branchId, name, email, passwordHash, status: 'ACTIVE' },
  });

  await prisma.userRole.createMany({
    data: [{ userId: user.id, roleId }],
    skipDuplicates: true,
  });

  return user;
}

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.permission.createMany({ data: permissions, skipDuplicates: true });

  const church = await prisma.church.upsert({
    where: { email: 'hello@church.test' },
    update: {
      name: 'Harvest Family Church',
      phone: '+1 555 010 2000',
      website: 'https://church.test',
      address: '100 Kingdom Way',
      city: 'Dallas',
      country: 'United States',
    },
    create: {
      name: 'Harvest Family Church',
      email: 'hello@church.test',
      phone: '+1 555 010 2000',
      website: 'https://church.test',
      address: '100 Kingdom Way',
      city: 'Dallas',
      country: 'United States',
    },
  });

  const branch = await prisma.branch.upsert({
    where: { churchId_name: { churchId: church.id, name: 'Main Branch' } },
    update: {
      address: '100 Kingdom Way',
      phone: '+1 555 010 2001',
      email: 'main@church.test',
      pastorName: 'Pastor Daniel Reed',
      isMainBranch: true,
    },
    create: {
      churchId: church.id,
      name: 'Main Branch',
      address: '100 Kingdom Way',
      phone: '+1 555 010 2001',
      email: 'main@church.test',
      pastorName: 'Pastor Daniel Reed',
      isMainBranch: true,
    },
  });

  const roles = await Promise.all(
    Object.keys(rolePermissions).map((name) =>
      prisma.role.upsert({
        where: { name },
        update: { isSystem: true },
        create: { name, description: `${name} role`, isSystem: true },
      }),
    ),
  );

  const permissionRows = await prisma.permission.findMany();
  const permissionByKey = new Map(permissionRows.map((permission) => [permission.key, permission.id]));
  const roleByName = new Map(roles.map((role) => [role.name, role.id]));

  for (const [roleName, keys] of Object.entries(rolePermissions)) {
    const roleId = roleByName.get(roleName);
    if (!roleId) continue;

    await prisma.rolePermission.createMany({
      data: keys
        .map((key) => permissionByKey.get(key))
        .filter((permissionId): permissionId is string => Boolean(permissionId))
        .map((permissionId) => ({ roleId, permissionId })),
      skipDuplicates: true,
    });
  }

  const superAdmin = await upsertUser(branch.id, 'Super Admin', 'admin@church.test', roleByName.get('Super Admin')!, passwordHash);
  const churchAdmin = await upsertUser(branch.id, 'Church Admin', 'admin.office@church.test', roleByName.get('Church Admin')!, passwordHash);
  const financeOfficer = await upsertUser(branch.id, 'Finance Officer', 'finance@church.test', roleByName.get('Finance Officer')!, passwordHash);
  const attendanceOfficer = await upsertUser(branch.id, 'Attendance Officer', 'attendance@church.test', roleByName.get('Attendance Officer')!, passwordHash);

  const people = await Promise.all(
    [
      { firstName: 'Grace', lastName: 'Johnson', email: 'grace.johnson@example.com', phone: '+1 555 100 0001', gender: 'FEMALE' as const, occupation: 'Nurse' },
      { firstName: 'Caleb', lastName: 'Brooks', email: 'caleb.brooks@example.com', phone: '+1 555 100 0002', gender: 'MALE' as const, occupation: 'Engineer' },
      { firstName: 'Maya', lastName: 'Chen', email: 'maya.chen@example.com', phone: '+1 555 100 0003', gender: 'FEMALE' as const, occupation: 'Teacher' },
      { firstName: 'Noah', lastName: 'Williams', email: 'noah.williams@example.com', phone: '+1 555 100 0004', gender: 'MALE' as const, occupation: 'Student' },
    ].map(({ firstName, lastName, email, phone, gender, occupation }) =>
      prisma.person.upsert({
        where: { email },
        update: { branchId: branch.id, firstName, lastName, phone, gender, occupation },
        create: {
          branchId: branch.id,
          firstName,
          lastName,
          email,
          phone,
          gender,
          occupation,
          city: 'Dallas',
          address: 'Demo address',
          notes: 'Seed demo person',
        },
      }),
    ),
  );

  await Promise.all(
    people.slice(0, 3).map((person, index) =>
      prisma.member.upsert({
        where: { personId: person.id },
        update: { branchId: branch.id, status: 'ACTIVE' },
        create: {
          branchId: branch.id,
          personId: person.id,
          membershipNumber: `HFC-${String(index + 1).padStart(4, '0')}`,
          status: 'ACTIVE',
          joinedAt: new Date(2026, index, 5),
          membershipType: index === 2 ? 'TRANSFER' : 'BAPTIZED',
          baptismStatus: index === 2 ? 'PENDING' : 'BAPTIZED',
          maritalStatus: index === 0 ? 'MARRIED' : 'SINGLE',
          emergencyContactName: 'Family Contact',
          emergencyContactPhone: '+1 555 100 0099',
        },
      }),
    ),
  );

  const family = await prisma.family.upsert({
    where: { branchId_familyName: { branchId: branch.id, familyName: 'Johnson Family' } },
    update: { primaryPhone: '+1 555 100 0001', primaryEmail: 'grace.johnson@example.com' },
    create: {
      branchId: branch.id,
      familyName: 'Johnson Family',
      address: '42 Hope Street',
      primaryPhone: '+1 555 100 0001',
      primaryEmail: 'grace.johnson@example.com',
    },
  });

  await prisma.familyMember.createMany({
    data: [
      { familyId: family.id, personId: people[0]!.id, relationship: 'Head', isHeadOfFamily: true },
      { familyId: family.id, personId: people[1]!.id, relationship: 'Spouse', isHeadOfFamily: false },
    ],
    skipDuplicates: true,
  });

  const group = await prisma.group.upsert({
    where: { branchId_name: { branchId: branch.id, name: 'Young Adults' } },
    update: { leaderId: people[2]!.id, status: 'ACTIVE' },
    create: {
      branchId: branch.id,
      name: 'Young Adults',
      type: 'SMALL_GROUP',
      description: 'Weekly young adults small group',
      leaderId: people[2]!.id,
      meetingDay: 'Thursday',
      meetingTime: '19:00',
      location: 'Room 204',
      status: 'ACTIVE',
    },
  });

  await prisma.groupMember.createMany({
    data: [
      { groupId: group.id, personId: people[2]!.id, role: 'Leader' },
      { groupId: group.id, personId: people[3]!.id, role: 'Member' },
    ],
    skipDuplicates: true,
  });

  const departmentSeeds = [
    {
      name: 'Ushering Department',
      leaderTitle: 'Chief Usher',
      description: 'Hospitality, seating, and sanctuary order for church services.',
      members: [
        ['Comfort', 'Seshie', 'Chief Usher', 'HEAD'],
        ['Ama', 'Mensah', 'Assistant Chief Usher', 'MEMBER'],
        ['Kojo', 'Boateng', 'Service Usher', 'MEMBER'],
        ['Esi', 'Agyeman', 'Welcome Team Usher', 'MEMBER'],
      ],
    },
    {
      name: 'Family Minstrels',
      leaderTitle: 'Music Director',
      description: 'Choir, worship team, and music ministry coordination.',
      members: [
        ['Oliver', 'Freeman', 'Music Director', 'HEAD'],
        ['Akosua', 'Owusu', 'Lead Vocalist', 'MEMBER'],
        ['Kwame', 'Addo', 'Keyboardist', 'MEMBER'],
        ['Nana', 'Asante', 'Choir Secretary', 'MEMBER'],
      ],
    },
    {
      name: 'New Breed',
      leaderTitle: 'NewBreed Coordinator',
      description: 'Youth and emerging leaders ministry.',
      members: [
        ['Derrick', 'Amoah', 'NewBreed Coordinator', 'HEAD'],
        ['Kofi', 'Sarpong', 'Youth Mentor', 'MEMBER'],
        ['Abena', 'Darko', 'Programs Assistant', 'MEMBER'],
        ['Yaw', 'Frimpong', 'Prayer Secretary', 'MEMBER'],
      ],
    },
    {
      name: 'Intercessors',
      leaderTitle: 'Head Intercessor',
      description: 'Prayer covering, intercession, and altar prayer support.',
      members: [
        ['Afia', 'Nyarko', 'Head Intercessor', 'HEAD'],
        ['Daniel', 'Osei', 'Prayer Coordinator', 'MEMBER'],
        ['Mabel', 'Adjei', 'Prayer Watch Lead', 'MEMBER'],
        ['Samuel', 'Ansah', 'Altar Prayer Minister', 'MEMBER'],
      ],
    },
    {
      name: 'Sunday School',
      leaderTitle: 'Sunday School Coordinator',
      description: 'Children teaching, curriculum, and classroom care.',
      members: [
        ['Priscilla', 'Appiah', 'Sunday School Coordinator', 'HEAD'],
        ['Joseph', 'Adu', 'Bible Class Teacher', 'MEMBER'],
        ['Linda', 'Quaye', 'Classroom Assistant', 'MEMBER'],
        ['Michael', 'Tetteh', 'Children Check-In Lead', 'MEMBER'],
      ],
    },
    {
      name: 'Deacon Board',
      leaderTitle: 'Chairman of Deacon Board',
      description: 'Deacon oversight, member care, and service administration.',
      members: [
        ['Emmanuel', 'Opoku', 'Chairman of Deacon Board', 'HEAD'],
        ['Theresa', 'Baah', 'Deaconess', 'MEMBER'],
        ['Benjamin', 'Koomson', 'Deacon', 'MEMBER'],
        ['Cecilia', 'Tawiah', 'Board Secretary', 'MEMBER'],
      ],
    },
    {
      name: 'Singles',
      leaderTitle: 'Singles Coordinator',
      description: 'Fellowship and discipleship for single adults.',
      members: [
        ['Nii', 'Aryee', 'Singles Coordinator', 'HEAD'],
        ['Efua', 'Biney', 'Events Lead', 'MEMBER'],
        ['Patrick', 'Owusu', 'Discipleship Lead', 'MEMBER'],
        ['Selina', 'Dapaah', 'Hospitality Lead', 'MEMBER'],
      ],
    },
    {
      name: 'Precious Ladies of Virtue (PVV)',
      leaderTitle: 'PVV President',
      description: 'Women fellowship, mentorship, and service outreach.',
      members: [
        ['Beatrice', 'Amponsah', 'PVV President', 'HEAD'],
        ['Gloria', 'Asiedu', 'Vice President', 'MEMBER'],
        ['Dorcas', 'Amoako', 'Welfare Coordinator', 'MEMBER'],
        ['Hannah', 'Koranteng', 'Treasurer', 'MEMBER'],
      ],
    },
    {
      name: 'Mighty Men of Valor (MMV)',
      leaderTitle: 'MMV President',
      description: 'Men fellowship, mentoring, and practical service.',
      members: [
        ['Isaac', 'Boadu', 'MMV President', 'HEAD'],
        ['Stephen', 'Aidoo', 'Vice President', 'MEMBER'],
        ['George', 'Donkor', 'Projects Coordinator', 'MEMBER'],
        ['Robert', 'Annan', 'Men Fellowship Secretary', 'MEMBER'],
      ],
    },
    {
      name: 'Media',
      leaderTitle: 'Media Coordinator',
      description: 'Photography, livestream, projection, and content support.',
      members: [
        ['Kelvin', 'Nartey', 'Media Coordinator', 'HEAD'],
        ['Yvonne', 'Gyan', 'Projection Lead', 'MEMBER'],
        ['Joel', 'Adusei', 'Livestream Operator', 'MEMBER'],
        ['Maame', 'Sackey', 'Content Assistant', 'MEMBER'],
      ],
    },
    {
      name: 'Audio',
      leaderTitle: 'Sound Engineer Lead',
      description: 'Sound engineering, microphones, mixing, and stage audio.',
      members: [
        ['Eric', 'Kwakye', 'Sound Engineer Lead', 'HEAD'],
        ['Dennis', 'Amoako', 'Front-of-House Engineer', 'MEMBER'],
        ['Bernice', 'Ofori', 'Microphone Technician', 'MEMBER'],
        ['Francis', 'Yeboah', 'Monitor Engineer', 'MEMBER'],
      ],
    },
    {
      name: 'Holy Family Dance Crew (HFD)',
      leaderTitle: 'Dance Coordinator',
      description: 'Dance ministry, choreography, and creative worship.',
      members: [
        ['Portia', 'Arthur', 'Dance Coordinator', 'HEAD'],
        ['Claudia', 'Lamptey', 'Choreography Assistant', 'MEMBER'],
        ['Elijah', 'Mensah', 'Dance Minister', 'MEMBER'],
        ['Adjoa', 'Twum', 'Costume Coordinator', 'MEMBER'],
      ],
    },
    {
      name: 'Evangelism Team',
      leaderTitle: 'Evangelism Coordinator',
      description: 'Soul winning, outreach planning, and follow-up ministry.',
      members: [
        ['Albert', 'Quartey', 'Evangelism Coordinator', 'HEAD'],
        ['Rosemond', 'Ahenkorah', 'Follow-Up Lead', 'MEMBER'],
        ['Peter', 'Agyei', 'Street Outreach Lead', 'MEMBER'],
        ['Vida', 'Okyere', 'New Converts Coordinator', 'MEMBER'],
      ],
    },
  ] as const;

  for (const departmentSeed of departmentSeeds) {
    const departmentPeople = await Promise.all(
      departmentSeed.members.map(([firstName, lastName, position]) => {
        const email = `${firstName}.${lastName}@hfcms.test`.toLowerCase();
        return prisma.person.upsert({
          where: { email },
          update: { branchId: branch.id, firstName, lastName, classification: 'Department Member', notes: `Seed department position: ${position}` },
          create: {
            branchId: branch.id,
            firstName,
            lastName,
            email,
            phone: '+233 20 000 0000',
            city: 'Accra',
            address: 'Seed department member address',
            classification: 'Department Member',
            notes: `Seed department position: ${position}`,
          },
        });
      }),
    );

    const leaderIndex = departmentSeed.members.findIndex((member) => member[3] === 'HEAD');
    const leader = departmentPeople[leaderIndex] ?? departmentPeople[0]!;
    const department = await prisma.group.upsert({
      where: { branchId_name: { branchId: branch.id, name: departmentSeed.name } },
      update: {
        type: 'DEPARTMENT',
        description: departmentSeed.description,
        leaderId: leader.id,
        meetingDay: departmentSeed.leaderTitle,
        status: 'ACTIVE',
        deletedAt: null,
      },
      create: {
        branchId: branch.id,
        name: departmentSeed.name,
        type: 'DEPARTMENT',
        description: departmentSeed.description,
        leaderId: leader.id,
        meetingDay: departmentSeed.leaderTitle,
        status: 'ACTIVE',
      },
    });

    await Promise.all(
      departmentSeed.members.map(([, , position, role], index) =>
        prisma.groupMember.upsert({
          where: { groupId_personId: { groupId: department.id, personId: departmentPeople[index]!.id } },
          update: { role, status: position },
          create: { groupId: department.id, personId: departmentPeople[index]!.id, role, status: position },
        }),
      ),
    );
  }

  const serviceDate = new Date('2026-06-14T10:00:00.000Z');
  const event = await prisma.event.upsert({
    where: { branchId_title_startDateTime: { branchId: branch.id, title: 'Sunday Worship Service', startDateTime: serviceDate } },
    update: { status: 'PUBLISHED', createdById: superAdmin.id },
    create: {
      branchId: branch.id,
      title: 'Sunday Worship Service',
      description: 'Weekly Sunday worship service',
      eventType: 'SERVICE',
      startDateTime: serviceDate,
      endDateTime: new Date('2026-06-14T12:00:00.000Z'),
      location: 'Main Auditorium',
      capacity: 500,
      status: 'PUBLISHED',
      createdById: superAdmin.id,
    },
  });

  const session = await prisma.attendanceSession.upsert({
    where: { branchId_title_sessionDate: { branchId: branch.id, title: 'Sunday Worship Check-In', sessionDate: serviceDate } },
    update: { eventId: event.id, createdById: attendanceOfficer.id },
    create: {
      branchId: branch.id,
      eventId: event.id,
      title: 'Sunday Worship Check-In',
      sessionDate: serviceDate,
      checkInMode: 'MANUAL',
      createdById: attendanceOfficer.id,
    },
  });

  await prisma.attendanceRecord.createMany({
    data: people.slice(0, 3).map((person) => ({
      sessionId: session.id,
      personId: person.id,
      status: 'PRESENT' as const,
      checkedInAt: serviceDate,
      checkedInById: attendanceOfficer.id,
    })),
    skipDuplicates: true,
  });

  const fund = await prisma.financialFund.upsert({
    where: { branchId_name: { branchId: branch.id, name: 'General Fund' } },
    update: { isActive: true },
    create: { branchId: branch.id, name: 'General Fund', description: 'General operating fund', isActive: true },
  });

  await prisma.contribution.createMany({
    data: [
      {
        branchId: branch.id,
        personId: people[0]!.id,
        fundId: fund.id,
        type: 'TITHE',
        amount: new Prisma.Decimal(350),
        paymentMethod: 'CARD',
        reference: 'SEED-TITHE-001',
        contributionDate: new Date('2026-06-10T12:00:00.000Z'),
        receivedById: financeOfficer.id,
        notes: 'Seed tithe',
      },
      {
        branchId: branch.id,
        personId: people[1]!.id,
        fundId: fund.id,
        type: 'OFFERING',
        amount: new Prisma.Decimal(125),
        paymentMethod: 'CASH',
        reference: 'SEED-OFFERING-001',
        contributionDate: new Date('2026-06-11T12:00:00.000Z'),
        receivedById: financeOfficer.id,
        notes: 'Seed offering',
      },
    ],
    skipDuplicates: true,
  });

  await prisma.expense.upsert({
    where: { branchId_title_expenseDate: { branchId: branch.id, title: 'June Utilities', expenseDate: new Date('2026-06-12T12:00:00.000Z') } },
    update: { status: 'APPROVED', approvedById: churchAdmin.id },
    create: {
      branchId: branch.id,
      category: 'Facilities',
      title: 'June Utilities',
      description: 'Monthly electricity and water bill',
      amount: new Prisma.Decimal(210),
      paymentMethod: 'BANK_TRANSFER',
      expenseDate: new Date('2026-06-12T12:00:00.000Z'),
      requestedById: financeOfficer.id,
      approvedById: churchAdmin.id,
      status: 'APPROVED',
    },
  });

  await prisma.setting.createMany({
    data: [
      { branchId: branch.id, key: 'timezone', value: 'America/Chicago', type: 'STRING' },
      { branchId: branch.id, key: 'currency', value: 'USD', type: 'STRING' },
      { branchId: branch.id, key: 'attendance.defaultMode', value: 'MANUAL', type: 'STRING' },
    ],
    skipDuplicates: true,
  });

  await prisma.auditLog.create({
    data: {
      branchId: branch.id,
      userId: superAdmin.id,
      action: 'seed.create',
      entity: 'System',
      entityId: 'seed',
      oldValue: Prisma.JsonNull,
      newValue: { seeded: true, adminEmail: 'admin@church.test' },
      ipAddress: '127.0.0.1',
      userAgent: 'seed-script',
    },
  });

  await prisma.activityLog.create({
    data: {
      branchId: branch.id,
      userId: superAdmin.id,
      title: 'Demo data seeded',
      description: 'MVP seed data was loaded successfully',
      type: 'SYSTEM',
    },
  });

  console.log(`Seed completed. Login with admin@church.test / ${password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
