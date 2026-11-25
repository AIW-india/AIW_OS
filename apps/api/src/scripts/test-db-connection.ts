import { checkDatabaseHealth, prisma } from '../database/prisma.js';

async function main() {
  console.log('Testing PostgreSQL / Neon database connectivity...');
  const result = await checkDatabaseHealth();
  console.log('Database Health Result:', JSON.stringify(result, null, 2));

  await prisma.$disconnect();

  if (result.status !== 'connected') {
    if (result.status === 'unconfigured') {
      console.warn(
        '\n⚠️  DATABASE_URL is not configured. Copy .env.example to .env and set your Neon development branch DATABASE_URL.',
      );
      process.exit(0);
    }
    process.exit(1);
  }

  console.log('✅ Successfully connected to PostgreSQL database!');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Database connectivity test failed:', err);
  process.exit(1);
});
