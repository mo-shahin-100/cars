import { initPostgresDatabase, testPostgresConnection } from './pg';
import { seedPostgresDatabase } from './seed.postgres';

async function main() {
  console.log('[PostgreSQL Init] Testing connection to PostgreSQL...');
  const connected = await testPostgresConnection();
  if (!connected) {
    console.error('[PostgreSQL Init] ❌ Failed to connect to PostgreSQL. Please check your DATABASE_URL in .env');
    process.exit(1);
  }

  console.log('[PostgreSQL Init] ✅ Connected successfully. Initializing schema...');
  await initPostgresDatabase();
  console.log('[PostgreSQL Init] ✅ Schema applied. Running seeder...');
  await seedPostgresDatabase();
  console.log('[PostgreSQL Init] 🎉 PostgreSQL Database is fully ready!');
  process.exit(0);
}

main().catch((err) => {
  console.error('[PostgreSQL Init] Error:', err);
  process.exit(1);
});
