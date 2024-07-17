/** @module logging **/
const strftime = require('strftime');


const logLevelDebug = 0,
  logLevelInfo = 1,
  logLevelWarning = 2,
  logLevelError = 3;

let logLevel = logLevelInfo;
/**
 * To show the source of the logs
 * @param {boolean=} isBot - If the log is from the bot or not
 * @returns {string} - 'Bot' or 'User' or ''
 */
function workAs(isBot) {
  if (isBot === undefined) {
    return '';
  } else {
    return `${isBot ? 'Bot ' : 'User'}`;
  }
}

/**
 * To show the prefix of the logs
 * @param {boolean=} isBot - If the log is from the bot or not
 * @param {string} level - The log level
 * @returns {string} - The prefix of the log
 **/
function logPrefix(isBot, level) {
  return `[${strftime('%Y-%m-%dT%H:%M:%S.%L')}] [${level}] - [${workAs(isBot)}] : `;
}

/**
 * Set the log level
 * @param {number} level - The log level
 **/
function setLogLevel(level) {
  logLevel = level;
}

/**
 * Log debug messages
 * @param {string} message - The message to log
 * @param {boolean=} isBot  - If the log is from the bot or not
 */
function logDebug(message, isBot) {
  if (logLevel <= logLevelDebug) {
    console.log(`${logPrefix(isBot, 'DBG ')}${message}`);
  }
}

/**
 * Log informational messages
 * @param {string} message - The message to log
 * @param {boolean=} isBot  - If the log is from the bot or not
 */
function logInfo(message, isBot) {
  if (logLevel <= logLevelInfo) {
    console.log(`${logPrefix(isBot, 'INFO')}${message}`);
  }
}

/**
 * Log warnings
 * @param {string} message - The message to log
 * @param {boolean=} isBot  - If the log is from the bot or not
 */
function logWarning(message, isBot) {
  if (logLevel <= logLevelWarning) {
    console.warn(`${logPrefix(isBot, 'WARN')}${message}`);
  }
}

/**
 * Log errors messages
 * @param {string} message - The message to log
 * @param {boolean=} isBot  - If the log is from the bot or not
 */
function logError(message, isBot) {
  if (logLevel <= logLevelError) {
    console.error(`${logPrefix(isBot, 'ERR ')}${message}`);
  }
}

module.exports = {
  logLevelDebug,
  logLevelInfo,
  logLevelWarning,
  logLevelError,
  setLogLevel,
  logDebug,
  logInfo,
  logWarning,
  logError,
};
