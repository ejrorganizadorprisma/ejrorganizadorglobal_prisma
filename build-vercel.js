import { execSync } from 'child_process';
import { existsSync } from 'fs';

function run(cmd) {
  console.log(`\n>>> Running: ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

try {
  // Step 1: Build shared-types
  console.log('=== Building shared-types ===');
  run('cd packages/shared-types && npx tsc');

  // Step 2: Build web frontend
  console.log('=== Building web frontend ===');
  run('cd apps/web && npx vite build');

  // Verify output exists
  if (existsSync('apps/web/dist/index.html')) {
    console.log('\n✅ Build successful! Output at apps/web/dist');
  } else {
    console.error('\n❌ Build failed: apps/web/dist/index.html not found');
    process.exit(1);
  }
} catch (error) {
  console.error('\n❌ Build error:', error.message);
  process.exit(1);
}
