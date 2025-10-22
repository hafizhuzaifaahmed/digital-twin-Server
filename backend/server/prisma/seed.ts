import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const levels = [
  { level_name: 'NOVICE', level_rank: 1 },
  { level_name: 'INTERMEDIATE', level_rank: 2 },
  { level_name: 'PROFICIENT', level_rank: 3 },
  { level_name: 'ADVANCED', level_rank: 4 },
  { level_name: 'EXPERT', level_rank: 5 },
] as const;

async function main() {
  // Seed job_level
  for (const l of levels) {
    await prisma.job_level.upsert({
      where: { level_name: l.level_name as any },
      update: { level_rank: l.level_rank },
      create: { level_name: l.level_name as any, level_rank: l.level_rank },
    });
  }

  // Seed skill_level
  for (const l of levels) {
    await prisma.skill_level.upsert({
      where: { level_rank: l.level_rank },
      update: { level_name: l.level_name as any },
      create: { level_name: l.level_name as any, level_rank: l.level_rank },
    });
  }

  console.log('Seeded job_level and skill_level with level_name and level_rank.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
