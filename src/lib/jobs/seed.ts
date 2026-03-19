import { prisma } from '../prisma';
import { seedKeywordsForUser } from './seed-keywords';

async function main() {
  console.log('[seed] Finding users...');
  const users = await prisma.user.findMany();

  if (users.length === 0) {
    console.log('[seed] No users found. Create a user by logging in first.');
  } else {
    for (const user of users) {
      console.log(`[seed] Seeding keywords for ${user.email}...`);
      await seedKeywordsForUser(user.id);
    }
  }

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('[seed] Error:', err);
  process.exit(1);
});
