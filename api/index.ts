import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { app } = await import('../apps/api/src/app.js');
    return app(req, res);
  } catch (err: any) {
    console.error('API Error:', err);
    return res.status(500).json({
      error: 'Failed to initialize API',
      message: err.message,
      stack: err.stack?.split('\n').slice(0, 5),
    });
  }
}
