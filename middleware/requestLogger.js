function requestLogger(req, res, next) {
  const start = process.hrtime();

  // Override res.writeHead to set header before sending headers to client
  const originalWriteHead = res.writeHead;
  res.writeHead = function (...args) {
    const diff = process.hrtime(start);
    const durationMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
    res.setHeader('X-Response-Time', `${durationMs}ms`);
    return originalWriteHead.apply(this, args);
  };

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
    const logLine = `[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} - ${durationMs}ms`;

    if (parseFloat(durationMs) > 200) {
      console.warn(`⚠️ [SLOW ENDPOINT] ${logLine} (exceeded 200ms target)`);
    } else if (process.env.NODE_ENV !== 'test') {
      console.log(logLine);
    }
  });

  next();
}

module.exports = requestLogger;
