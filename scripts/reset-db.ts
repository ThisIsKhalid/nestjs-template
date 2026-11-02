import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

async function resetDatabase() {
  console.log('🔄 Resetting database: removing all data...\n');

  // Query all user tables in public schema except migration tracking
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename != '_prisma_migrations';
  `;

  console.log(`📋 Found ${tables.length} tables to clean:`);

  // Truncate all tables with CASCADE
  for (const { tablename } of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
      console.log(`   ✅ Truncated: ${tablename}`);
    } catch (e) {
      console.error(`   ⚠️ Failed to truncate ${tablename}:`, e);
    }
  }

  console.log('\n🧹 All data has been successfully cleared from the database.');
}

resetDatabase()
  .catch((err) => {
    console.error('❌ Failed to reset database:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
