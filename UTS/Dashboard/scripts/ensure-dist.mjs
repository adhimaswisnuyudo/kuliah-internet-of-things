/**
 * If dist/ is missing (e.g. fresh server deploy), run `vite build` once before `serve.mjs` in production.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const index = path.join(root, 'dist', 'index.html');

if (!fs.existsSync(index)) {
  console.log('[uts-dashboard] dist/ not found; running npm run build...');
  try {
    execSync('npm run build', { stdio: 'inherit', cwd: root, env: process.env });
  } catch {
    console.error(
      '\n[uts-dashboard] Build failed. Install devDependencies (e.g. `npm install` without --omit=dev), or run `npm run build` locally and upload the dist/ folder.\n',
    );
    process.exit(1);
  }
}
