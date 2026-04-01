import type { VercelRequest, VercelResponse } from '@vercel/node';

let app: any;
let initError: string | null = null;

try {
  const mod = await import('../apps/api/src/app.js');
  app = mod.app;
} catch (err: any) {
  initError = err.stack || err.message;
  console.error('Failed to load app:', initError);
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (initError) {
    return res.status(500).json({ error: 'App initialization failed', details: initError });
  }
  return app(req, res);
}
