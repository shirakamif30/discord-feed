/**
 * Simple Logger Utility
 */
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const LEVEL = LEVELS[process.env.LOG_LEVEL || 'info'] ?? 1;
const ts = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

const Logger = {
  debug: (...a) => LEVEL <= 0 && console.log(`[${ts()}] [DEBUG]`, ...a),
  info:  (...a) => LEVEL <= 1 && console.log(`[${ts()}] [INFO] `, ...a),
  warn:  (...a) => LEVEL <= 2 && console.warn(`[${ts()}] [WARN] `, ...a),
  error: (...a) => LEVEL <= 3 && console.error(`[${ts()}] [ERROR]`, ...a),
};
module.exports = Logger;
