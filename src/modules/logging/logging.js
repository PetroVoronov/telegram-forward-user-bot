/** @module logging **/

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
    return `${isBot ? 'Bot' : 'User'}| `;
  }
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
    console.log(`${workAs(isBot)}${message}`);
  }
}

/**
 * Log informational messages
 * @param {string} message - The message to log
 * @param {boolean=} isBot  - If the log is from the bot or not
 */
function logInfo(message, isBot) {
  if (logLevel <= logLevelInfo) {
    console.log(`${workAs(isBot)}${message}`);
  }
}

/**
 * Log warnings
 * @param {string} message - The message to log
 * @param {boolean=} isBot  - If the log is from the bot or not
 */
function logWarning(message, isBot) {
  if (logLevel <= logLevelWarning) {
    console.warn(`${workAs(isBot)}${message}`);
  }
}

/**
 * Log errors messages
 * @param {string} message - The message to log
 * @param {boolean=} isBot  - If the log is from the bot or not
 */
function logError(message, isBot) {
  if (logLevel <= logLevelError) {
    console.error(`${workAs(isBot)}${message}`);
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
