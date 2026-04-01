import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    ok: true,
    message: 'API serverless function works!',
    env: {
      hasDbUrl: !!process.env.DATABASE_URL,
      hasJwt: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV,
    },
    url: req.url,
  });
}
