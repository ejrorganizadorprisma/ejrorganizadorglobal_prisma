import { execSync } from 'child_process';
import { existsSync, cpSync } from 'fs';
import { build } from 'esbuild';

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

  // Step 3: Bundle API serverless function with esbuild JS API
  console.log('=== Bundling API serverless function ===');
  await build({
    entryPoints: ['apps/api/src/app.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    outfile: 'api/app.bundle.cjs',
    external: ['pg-native'],
  });
  console.log('API bundle created: api/app.bundle.cjs');

  // Step 4: Copy web output to root dist
  console.log('=== Copying output to dist/ ===');
  cpSync('apps/web/dist', 'dist', { recursive: true });

  if (existsSync('dist/index.html') && existsSync('api/app.bundle.cjs')) {
    console.log('\n✅ Build successful!');
  } else {
    console.error('\n❌ Build failed: missing output files');
    process.exit(1);
  }
} catch (error) {
  console.error('\n❌ Build error:', error.message);
  process.exit(1);
}
