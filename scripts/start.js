const { execSync } = require('child_process');

// Check if DATABASE_URL is available
if (process.env.DATABASE_URL) {
  console.log('DATABASE_URL found, running prisma db push...');
  try {
    execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
    console.log('Database schema synced successfully');
  } catch (error) {
    console.error('Warning: prisma db push failed, but continuing with server start');
    console.error(error.message);
  }
} else {
  console.log('DATABASE_URL not found, skipping prisma db push');
}

// Start Next.js server
console.log('Starting Next.js server...');
execSync('npx next start', { stdio: 'inherit' });
