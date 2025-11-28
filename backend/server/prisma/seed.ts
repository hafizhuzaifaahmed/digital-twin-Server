import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Password hashing function
const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

// Provided list of users to create (Company: BUH11BSE5A)
const providedUsers = [
  { name: 'Huzaifa Imran', email: 'huzaifa@crystalsystem.com', password: '123456@' },
  { name: 'Ridha Shahzad', email: 'ridha@crystalsystem.com', password: '123456@' },
  { name: 'Shajar Hussain', email: 'shajar@crystalsystem.com', password: '123456@' },
  { name: 'Faisal Khan', email: 'faisal@crystalsystem.com', password: '123456@' },
  { name: 'Majan Rehman', email: 'majan@crystalsystem.com', password: '123456@' },
] as const;

const levels = [
  { level_name: 'NOVICE', level_rank: 1 },
  { level_name: 'INTERMEDIATE', level_rank: 2 },
  { level_name: 'PROFICIENT', level_rank: 3 },
  { level_name: 'ADVANCED', level_rank: 4 },
  { level_name: 'EXPERT', level_rank: 5 },
] as const;

const organizationTypes = [
  { name: 'Functional', description: 'Department-based hierarchical structure' },
  { name: 'Divisional', description: 'Organized by product, market, or geographic divisions' },
  { name: 'Matrix', description: 'Dual reporting structure combining functional and divisional' },
  { name: 'Flat', description: 'Few or no levels of middle management' },
  { name: 'Network', description: 'Decentralized structure with interconnected teams' },
];

async function createNormalUsersForExisting(companyCode: string, usersData: readonly { name: string; email: string; password: string }[]) {
  // Seed job_level
  for (const l of levels) {
    await prisma.job_level.upsert({
      where: { level_name: l.level_name as any },
      update: { level_rank: l.level_rank },
      create: { level_name: l.level_name as any, level_rank: l.level_rank },
    });
  }

  // Ensure normal user role exists. Prefer 'NORMAL_USER', fallback to 'User'
  let userRole = await prisma.role.findUnique({ where: { name: 'NORMAL_USER' } });
  if (!userRole) {
    userRole = await prisma.role.findUnique({ where: { name: 'User' } });
  }
  if (!userRole) {
    userRole = await prisma.role.create({
      data: { name: 'NORMAL_USER', description: 'Normal user with limited access' },
    });
  }

  // Find the existing company by code
  const company = await prisma.company.findUnique({ where: { companyCode } });
  if (!company) {
    throw new Error(`Company with code ${companyCode} not found. Please ensure it exists before seeding users.`);
  }

  // Create or upsert each provided user
  const created: { email: string; user_id: number }[] = [];
  for (const user of usersData) {
    const hashedPassword = await hashPassword(user.password);
    const existingUser = await prisma.user.findUnique({ where: { email: user.email } });
    if (existingUser) {
      await prisma.user.update({
        where: { email: existingUser.email },
        data: { name: user.name, password: hashedPassword, created_by: 27 },
      });
    } else {
      const newUser = await prisma.user.create({
        data: {
          name: user.name,
          email: user.email,
          password: hashedPassword,
          role_id: userRole.role_id,
          company_id: company.company_id,
          created_by: 27,
        },
      });
      created.push({ email: user.email, user_id: newUser.user_id });
    }
  }

  console.log('Created or updated users:', created);
}

async function main() {
  await createNormalUsersForExisting('BUH11BSE5A', providedUsers);

  // Seed skill_level
  for (const l of levels) {
    await prisma.skill_level.upsert({
      where: { level_rank: l.level_rank },
      update: { level_name: l.level_name as any },
      create: { level_name: l.level_name as any, level_rank: l.level_rank },
    });
  }

  // Seed OrganizationType
  for (const orgType of organizationTypes) {
    await prisma.organizationType.upsert({
      where: { name: orgType.name },
      update: { description: orgType.description },
      create: { name: orgType.name, description: orgType.description },
    });
  }

  console.log('Seeded job_level, skill_level, and OrganizationType.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
