import { execSync } from 'node:child_process';

if (process.env.RENDER === 'true') {
  console.log('Render build: skipping frontend postinstall. Set Root Directory to backend on Render.');
  process.exit(0);
}

execSync('npm install --prefix frontend', { stdio: 'inherit' });
