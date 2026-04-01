const handler = function (req: any, res: any) {
  res.status(200).json({ ok: true, url: req.url });
};

module.exports = handler;
