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

function setLogger(logger) {
  if (
    typeof logger === 'object' &&
    typeof logger.debug === 'function' &&
    typeof logger.warn === 'function' &&
    typeof logger.error === 'function' &&
    typeof logger.info === 'function'
  ) {
    return logger;
  } {
    return null;
  }

}

function setLogLevel(log, level) {
  if (log instanceof SimpleLogger && SimpleLogger.levels.includes(level)) {
    log.setLogLevel(level);
  }
}

module.exports = {
  SimpleLogger,
  setLogger,
  setLogLevel,
};
