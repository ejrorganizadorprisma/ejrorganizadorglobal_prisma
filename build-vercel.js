import { execSync } from 'child_process';
import { existsSync, cpSync } from 'fs';

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

  // Step 3: Copy output to root dist (where Vercel expects it)
  console.log('=== Copying output to dist/ ===');
  cpSync('apps/web/dist', 'dist', { recursive: true });

  if (existsSync('dist/index.html')) {
    console.log('\n✅ Build successful! Output at dist/');
  } else {
    console.error('\n❌ Build failed: dist/index.html not found');
    process.exit(1);
  }
} catch (error) {
  console.error('\n❌ Build error:', error.message);
  process.exit(1);
}
