import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database users and initial system configuration...');

  const seedUsers = [
    {
      githubUsername: 'repomanager-test',
      name: 'RepoManager Test Admin',
      avatarUrl: 'https://github.com/repomanager-test.png',
      role: UserRole.ADMIN,
    },
    {
      githubUsername: 'amey-nyk',
      name: 'Amey Nyk',
      avatarUrl: 'https://github.com/amey-nyk.png',
      role: UserRole.USER,
    },
    {
      githubUsername: 'ericamendes554-cpu',
      name: 'Erica Mendes',
      avatarUrl: 'https://github.com/ericamendes554-cpu.png',
      role: UserRole.USER,
    },
    {
      githubUsername: 'monalidessai',
      name: 'Monali Dessai',
      avatarUrl: 'https://github.com/monalidessai.png',
      role: UserRole.USER,
    },
    {
      githubUsername: 'shannonclidias',
      name: 'Shannon Clidias',
      avatarUrl: 'https://github.com/shannonclidias.png',
      role: UserRole.USER,
    },
    {
      githubUsername: 'sharv-dessai',
      name: 'Sharv Dessai',
      avatarUrl: 'https://github.com/sharv-dessai.png',
      role: UserRole.USER,
    },
    {
      githubUsername: 'Sydney06-bit',
      name: 'Sydney',
      avatarUrl: 'https://github.com/Sydney06-bit.png',
      role: UserRole.USER,
    },
    {
      githubUsername: 'Vinay-Huvinmath',
      name: 'Vinay Huvinmath',
      avatarUrl: 'https://github.com/Vinay-Huvinmath.png',
      role: UserRole.USER,
    },
  ];

  for (const user of seedUsers) {
    const upserted = await prisma.user.upsert({
      where: { githubUsername: user.githubUsername },
      update: {
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
      create: {
        githubUsername: user.githubUsername,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    });
    console.log(`Seeded user: ${upserted.githubUsername} -> ${upserted.role}`);
  }

  // Ensure default SystemConfig exists
  await prisma.systemConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      repoPrefix: 'pt-',
      retentionDays: 90,
      warningDays: 7,
      defaultExpiryAction: 'delete',
      githubOrg: process.env.GITHUB_ORG || 'pt-repo-org',
    },
  });

  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
