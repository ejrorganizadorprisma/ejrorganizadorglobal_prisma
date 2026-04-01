let handler;

try {
  const { app } = require('./app.bundle.cjs');
  handler = app;
} catch (error) {
  handler = (req, res) => {
    res.status(500).json({
      error: 'Failed to load API bundle',
      message: error.message,
      stack: error.stack ? error.stack.split('\n').slice(0, 10) : null,
    });
  };
}

module.exports = handler;
