class SimpleLogger {
  // eslint-disable-next-line sonarjs/public-static-readonly
  static levels = ['debug', 'info', 'warn', 'error'];

  constructor(level) {
    this.level = level;
  }

  setLogLevel(level) {
    if (SimpleLogger.levels.includes(level)) {
      this.level = level;
    }
  }

  error(...message) {
    if (SimpleLogger.levels.indexOf('error') >= SimpleLogger.levels.indexOf(this.level)) {
      console.log(`ERROR: ${message}`);
    }
  }
  warn(...message) {
    if (SimpleLogger.levels.indexOf('warn') >= SimpleLogger.levels.indexOf(this.level)) {
      console.log(`WARN: ${message}`);
    }
  }

  info(...message) {
    if (SimpleLogger.levels.indexOf('info') >= SimpleLogger.levels.indexOf(this.level)) {
      console.log(`INFO: ${message}`);
    }
  }

  debug(...message) {
    if (SimpleLogger.levels.indexOf('debug') >= SimpleLogger.levels.indexOf(this.level)) {
      console.log(`DEBUG: ${message}`);
    }
  }
}

module.exports = {
  SimpleLogger,
};
