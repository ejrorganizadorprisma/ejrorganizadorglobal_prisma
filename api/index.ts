let handler;

try {
  const { app } = require('./app.bundle.cjs');
  handler = app;
} catch (error: any) {
  // If bundle fails to load, return error details for debugging
  handler = (req: any, res: any) => {
    res.status(500).json({
      error: 'Failed to load API bundle',
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5),
    });
  };
}

module.exports = handler;
