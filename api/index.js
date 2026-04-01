module.exports = (req, res) => {
  res.json({ status: 'ok', message: 'API is alive', time: new Date().toISOString() });
};
