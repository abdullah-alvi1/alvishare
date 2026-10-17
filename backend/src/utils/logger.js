const ts = () => new Date().toISOString();
module.exports = {
  info: (...a) => console.log(ts(), 'INFO ', ...a),
  warn: (...a) => console.warn(ts(), 'WARN ', ...a),
  error: (...a) => console.error(ts(), 'ERROR', ...a),
  http(req, res, ms) {
    console.log(ts(), 'HTTP ', req.method, req.originalUrl.split('?')[0], res.statusCode, `${ms}ms`);
  },
};
