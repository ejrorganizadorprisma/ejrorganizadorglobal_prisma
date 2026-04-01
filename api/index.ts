let appInstance: any = null;
let loadError: string | null = null;

async function getApp() {
  if (appInstance) return appInstance;
  if (loadError) throw new Error(loadError);

  try {
    const mod = await import('../apps/api/src/app.js');
    appInstance = mod.app;
    return appInstance;
  } catch (err: any) {
    loadError = err.stack || err.message;
    throw err;
  }
}

const handler = async function (req: any, res: any) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (err: any) {
    console.error('API Error:', err);
    return res.status(500).json({
      error: 'Failed to load API',
      message: err.message,
    });
  }
};

module.exports = handler;
