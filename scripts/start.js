const { execSync } = require('child_process');

// Check if DATABASE_URL is available
if (process.env.DATABASE_URL) {
  console.log('DATABASE_URL found, running prisma db push...');
  console.log('DATABASE_URL format check:', process.env.DATABASE_URL.substring(0, 20) + '...');

  try {
    // --accept-data-loss allows schema changes that might lose data
    // --skip-generate skips Prisma Client generation (already done during build)
    execSync('npx prisma db push --accept-data-loss --skip-generate', {
      stdio: 'inherit',
      env: { ...process.env }
    });
    console.log('Database schema synced successfully');

    // Run multi-tenant migration if needed
    console.log('Checking if multi-tenant migration is needed...');
    try {
      execSync('npx tsx scripts/migrate-multi-tenant.ts', {
        stdio: 'inherit',
        env: { ...process.env }
      });
      console.log('Multi-tenant migration check completed');
    } catch (migrationError) {
      console.error('Warning: multi-tenant migration failed');
      console.error('Error:', migrationError.message);
      console.error('Continuing with server start anyway...');
    }
  } catch (error) {
    console.error('Warning: prisma db push failed');
    console.error('Error:', error.message);
    console.error('Continuing with server start anyway...');
  }
} else {
  console.error('ERROR: DATABASE_URL not found!');
  console.error('Please set DATABASE_URL environment variable in Render dashboard');
}

// Start Next.js server
console.log('Starting Next.js server...');
try {
  execSync('npx next start', { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to start Next.js server:', error.message);
  process.exit(1);
}
