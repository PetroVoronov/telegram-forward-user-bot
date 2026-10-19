const {Api, TelegramClient} = require('teleproto');
const {StoreSession} = require('teleproto/sessions');
const {Button} = require('teleproto/tl/custom/button');
const {createHash, randomBytes} = require('node:crypto');
const readline = require('node:readline/promises');
const {stdin: input, stdout: output, exit} = require('node:process');
const stringify = require('json-stringify-safe');
const {LocalStorage} = require('node-localstorage');
const {menuDefaults, MenuItemRoot} = require('telegram-menu-from-structure');
const {Cache} = require('./modules/cache/Cache');
const {Command} = require('commander');
const qrcode = require('qrcode-terminal');
const {setTimeout} = require('node:timers');
const {securedLogger: log, SecuredLogger} = require('./modules/logging/logging');
const {getEnabledRulesForSource, isMessageInRuleTopic, getRuleKey, getMessageState} = require('./modules/forwarding/rules');
const {NewMessage, NewMessageEvent} = require('teleproto/events');
const {EditedMessage} = require('teleproto/events/EditedMessage');
const {CallbackQuery, CallbackQueryEvent} = require('teleproto/events/CallbackQuery');
const {name: scriptName, version: scriptVersion} = require('./version');
const i18n = require('./modules/i18n/i18n.config');

const refreshIntervalDefault = 300;
const refreshIntervalMinimum = 30;
const resubscribeIntervalDefault = 60;
const resubscribeIntervalMinimum = 30;
let refreshInterval = refreshIntervalDefault * 1000;
let resubscribeInterval = resubscribeIntervalDefault * 60 * 1000;

const botAuthTokenMinimumLength = 43;

const program = new Command();

program
  .name(scriptName)
  .usage('[options]')
  .description('Forward messages between Telegram chats/groups/channels')
  .helpOption('-h, --help', 'Show help')
  .version(scriptVersion, '-v, --version', 'Show version number')
  .addHelpText('after', `\n${scriptName} v${scriptVersion}`)
  .option('-r, --refresh-interval <seconds>', 'Refresh information from Telegram servers, in seconds', refreshIntervalDefault)
  .option('-s, --resubscribe-interval <minutes>', 'Resubscribe on changes in source chats, in minutes', resubscribeIntervalDefault)
  .option('-b, --no-bot', 'Start without the bot instance')
  .option('--login-qr', 'Log in the user via QR code (Telegram app: Settings - Devices - Link Desktop Device) instead of a login code')
  .option('-d, --debug', 'Debug level of logging', false)
  .option('--plain-logs', 'Disable ANSI color codes in log output')
  .option('--no-debug-menu', 'Disable debug level of logging for the Menu instance')
  .option('--no-debug-cache', 'Disable debug level of logging for the Cache instance')
  .option('--debug-client-user', 'Debug level of logging for the client "user" instance', false)
  .option('--debug-client-bot', 'Debug level of logging for the client "bot" instance', false)
  .option('-c, --command <command>', 'Test menu command from the command line');

program.parse(process.argv);

const parsedOptions = program.opts();
const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};
const options = {
  refreshInterval: toNumber(parsedOptions.refreshInterval, refreshIntervalDefault),
  resubscribeInterval: toNumber(parsedOptions.resubscribeInterval, resubscribeIntervalDefault),
  noBot: parsedOptions.bot === false,
  loginQr: Boolean(parsedOptions.loginQr),
  debug: Boolean(parsedOptions.debug),
  plainLogs: Boolean(parsedOptions.plainLogs),
  noDebugMenu: parsedOptions.debugMenu === false,
  noDebugCache: parsedOptions.debugCache === false,
  debugClientUser: Boolean(parsedOptions.debugClientUser),
  debugClientBot: Boolean(parsedOptions.debugClientBot),
  command: parsedOptions.command,
  processMissed: parsedOptions.processMissed,
};

if (options.debug) {
  log.setLevel('debug');
}

if (options.plainLogs) {
  log.setColorsEnabled(false);
}

log.appendMaskWord('apiId', 'apiHash', 'DeviceSN', 'ClientId', 'phone');

const logAsBot = {isBot: true};
const logAsUser = {isBot: false};

log.info(`${scriptName} v${scriptVersion} started!`);
if (options.noBot === true) log.info('Starting without bot instance!');
if (options.debug === true) log.info('Verbose logging is enabled!');
if (options.command !== undefined) log.info(`Command to test: ${options.command}`);

const getLanguages = () => {
  return new Map(i18n.getLocales().map((locale) => [locale, locale]));
};
const onLanguageChange = (data, key, _path) => {
  i18n.setLocale(data[key]);
  return true;
};
const onRefreshIntervalChange = (data, key, _path) => {
  if (refreshIntervalSetOnStart === false) {
    refreshInterval = (data?.[key] || refreshIntervalDefault) * 1000;
    refreshDialogsInit();
  }
};
const onResubscribeIntervalChange = (data, key, _path) => {
  const newResubscribeInterval = (data?.[key] || resubscribeIntervalDefault) * 60 * 1000;
  if (resubscribeIntervalSetOnStart === false && newResubscribeInterval !== resubscribeInterval) {
    resubscribeInterval = newResubscribeInterval;
    resubscribeInit();
  }
};
const onMenuColumnsMaxCountChange = (data, key, _path) => {
  if (menuRoot !== null && menuRoot !== undefined) {
    menuRoot.menuColumnsMaxCount = data?.[key] || 0;
  }
};
const onTextSummaryMaxLengthChange = (data, key, _path) => {
  if (menuRoot !== null && menuRoot !== undefined) {
    menuRoot.textSummaryMaxLength = data?.[key] || 0;
  }
};
const onSpaceBetweenColumnsChange = (data, key, _path) => {
  if (menuRoot !== null && menuRoot !== undefined) {
    menuRoot.spaceBetweenColumns = data?.[key] || 1;
  }
};
const onButtonMaxCountChange = (data, key, _path) => {
  if (menuRoot !== null && menuRoot !== undefined) {
    menuRoot.buttonsMaxCount = data?.[key] || 10;
  }
};
/**
 * Represents the configuration structure for the menu.
 *
 * @typedef {Object} ConfigurationStructure
 * @property {string} language - The language of the menu.
 * @property {number} refreshInterval - The interval to refresh data from Telegram servers in seconds.
 * @property {number} resubscribeInterval - The interval to resubscribe on chats in minutes.
 * @property {number} menuColumnsMaxCount - The maximum count of columns in one row of the menu.
 * @property {number} textSummaryMaxLength - The approximate maximum length of the text in one row of the menu.
 * @property {number} spaceBetweenColumns - The space between columns in the menu.
 * @property {number} buttonsMaxCount - The maximum count of buttons on one "page" of the menu.
 */
const configurationStructure = {
  type: 'object',
  itemContent: {
    language: {
      type: 'string',
      presence: 'mandatory',
      editable: true,
      sourceType: 'list',
      source: getLanguages,
      onSetAfter: onLanguageChange,
      default: i18n.getLocale(),
      label: 'Menu language',
      text: 'Language of the Menu',
    },
    refreshInterval: {
      type: 'number',
      subType: 'integer',
      options: {
        min: refreshIntervalMinimum,
        max: 900,
        step: 10,
      },
      sourceType: 'input',
      presence: 'mandatory',
      editable: true,
      onSetAfter: onRefreshIntervalChange,
      default: refreshIntervalDefault,
      label: 'Refresh interval',
      text: 'Interval to refresh data from Telegram servers in seconds',
    },
    resubscribeInterval: {
      type: 'number',
      subType: 'integer',
      options: {
        min: resubscribeIntervalMinimum,
        max: 180,
        step: 10,
      },
      sourceType: 'input',
      presence: 'mandatory',
      editable: true,
      onSetAfter: onResubscribeIntervalChange,
      default: resubscribeIntervalDefault,
      label: 'Resubscribe interval',
      text: 'Interval to resubscribe on chats in minutes',
    },
    menuColumnsMaxCount: {
      type: 'number',
      subType: 'integer',
      options: {
        min: menuDefaults.columnsMaxCount.min,
        max: menuDefaults.columnsMaxCount.max,
        step: menuDefaults.columnsMaxCount.step,
      },
      sourceType: 'input',
      presence: 'mandatory',
      editable: true,
      onSetAfter: onMenuColumnsMaxCountChange,
      default: menuDefaults.columnsMaxCount.default,
      label: 'Max columns in row',
      text: 'Max count of columns in one row of the menu',
    },
    textSummaryMaxLength: {
      type: 'number',
      subType: 'integer',
      options: {
        min: menuDefaults.textSummaryMaxLength.min,
        max: menuDefaults.textSummaryMaxLength.max,
        step: menuDefaults.textSummaryMaxLength.step,
      },
      sourceType: 'input',
      presence: 'mandatory',
      editable: true,
      onSetAfter: onTextSummaryMaxLengthChange,
      default: menuDefaults.textSummaryMaxLength.default,
      label: 'Text summary max length',
      text: 'Approximated max length of the text in one row of the menu',
    },
    spaceBetweenColumns: {
      type: 'number',
      subType: 'integer',
      options: {
        min: menuDefaults.spaceBetweenColumns.min,
        max: menuDefaults.spaceBetweenColumns.max,
        step: menuDefaults.spaceBetweenColumns.step,
      },
      sourceType: 'input',
      presence: 'mandatory',
      editable: true,
      onSetAfter: onSpaceBetweenColumnsChange,
      default: menuDefaults.spaceBetweenColumns.default,
      label: 'Space between columns',
      text: 'Space between columns in the menu',
    },
    buttonsMaxCount: {
      type: 'number',
      subType: 'integer',
      options: {
        min: menuDefaults.buttonsMaxCount.min,
        max: menuDefaults.buttonsMaxCount.max,
        step: menuDefaults.buttonsMaxCount.step,
      },
      sourceType: 'input',
      presence: 'mandatory',
      editable: true,
      onSetAfter: onButtonMaxCountChange,
      default: menuDefaults.buttonsMaxCount.default,
      label: 'Max buttons on "page"',
      text: 'Max count of buttons on the one "page" of the menu',
    },
    users: {
      type: 'array',
      presence: 'mandatory',
      editable: true,
      default: [],
      label: 'Additional users',
      text: 'Additional users to be allowed to use the bot',
      structure: {
        primaryId: (data, isShort = false) => {
          let result = ` [${data || '?'}]`;
          const user = clientDialogs.find((dialog) => dialog.isUser && `${dialog.id}` === `${data}`);
          if (typeof user === 'object' && typeof user.title === 'string') {
            result = `${user.title}${isShort ? '' : result}`;
          }
          return result;
        },
        plain: true,
        itemContent: {
          value: {
            type: 'number',
            presence: 'mandatory',
            editable: true,
            sourceType: 'list',
            sourceAsync: async (data, force) => {
              if (force === true) {
                await refreshDialogs();
              }
              const result = new Map(),
                users = clientDialogs.filter(
                  (dialog) =>
                    dialog.isGroup !== true && dialog.isChannel !== true && dialog.isUser === true && dialog.entity?.bot === false,
                );
              users.forEach((dialog) => {
                result.set(Number(dialog.entity.id), dialog.title);
              });
              return result;
            },
            extraRefresh: true,
            label: 'User Name',
            text: 'User Name to be allowed to use the bot',
          },
        },
      },
    },
  },
};
const storage = new LocalStorage('data/storage');
const cache = new Cache({
  getItem: (key) => storage.getItem(key),
  setItem: (key, value) => storage.setItem(key, value),
  removeItem: (key) => storage.removeItem(key),
  logLevel: options.noDebugCache ? 'info' : '',
});
const configurationId = 'configuration';
let configuration = cache.getItem(configurationId, 'object') || {};

Object.keys(configuration).forEach((key) => {
  if (configurationStructure.itemContent[key] === undefined) {
    delete configuration[key];
  }
});
if (Object.keys(configuration).length !== Object.keys(configurationStructure.itemContent).length) {
  Object.keys(configurationStructure.itemContent).forEach((key) => {
    if (configuration[key] === undefined) {
      configuration[key] = configurationStructure.itemContent[key].default;
    }
  });
  cache.setItem(configurationId, configuration);
}

// The interval from the command line has priority over the one from the configuration (set in the menu)
const refreshIntervalSetOnStart = program.getOptionValueSource('refreshInterval') === 'cli',
  resubscribeIntervalSetOnStart = program.getOptionValueSource('resubscribeInterval') === 'cli';
refreshInterval =
  Math.max(
    (refreshIntervalSetOnStart ? options.refreshInterval : configuration.refreshInterval) || refreshIntervalDefault,
    refreshIntervalMinimum,
  ) * 1000;
resubscribeInterval =
  Math.max(
    (resubscribeIntervalSetOnStart ? options.resubscribeInterval : configuration.resubscribeInterval) || resubscribeIntervalDefault,
    resubscribeIntervalMinimum,
  ) *
  60 *
  1000;
log.info(`Refresh interval: ${refreshInterval / 1000} seconds${refreshIntervalSetOnStart ? ' (command line)' : ''}!`);
log.info(`Resubscribe interval: ${resubscribeInterval / 60000} minutes${resubscribeIntervalSetOnStart ? ' (command line)' : ''}!`);

const timeOutToPreventBotFlood = 1000 * 15; // 15 seconds
const storeSession = new StoreSession('data/session');
// Last processed message is stored per source chat, last forwarded message - per rule (see getRuleKey())
const lastProcessed = cache.getItem('lastProcessed') || {};
const lastForwarded = cache.getItem('lastForwarded') || {};
// Time when the application was active last time (updated on each refresh and on exit). The missed messages are processed only
// if they are newer, otherwise the outdated "last processed" state can lead to forwarding of very old messages
const lastActiveTimeStampId = 'lastActiveTimeStamp';
const lastActiveOnStart = cache.getItem(lastActiveTimeStampId, 'number');
const missedMessagesTimeMargin = 5 * 60 * 1000;
// Messages waiting for the anti fast edit delay: rule key -> Map of message id -> {ids, timeout}
const pendingForwards = {};
// The last forward request to the destination: destination key -> Promise, see forwardMessage()
const forwardQueues = {};
const forwardRulesId = 'forwardRules';
const topicsCache = {};
const forumTopicsPageSize = 100;
const forumTopicsMaxPages = 20;

/**
 * Get the forum topics. Telegram returns them by pages, so the pages are requested until the last one.
 * @param {object} entity - The forum entity
 * @returns {Promise<object[]>} The list of the topics
 **/
async function getAllForumTopics(entity) {
  const topics = [];
  let offsetDate = 0,
    offsetId = 0,
    offsetTopic = 0;
  for (let page = 0; page < forumTopicsMaxPages; page++) {
    const result = await clientAsUser.invoke(
      new Api.messages.GetForumTopics({peer: entity, q: '', limit: forumTopicsPageSize, offsetId, offsetDate, offsetTopic}),
    );
    const pageTopics = (result.topics || []).filter((topic) => topics.some((item) => item.id === topic.id) === false);
    topics.push(...pageTopics);
    if (pageTopics.length === 0 || result.topics.length < forumTopicsPageSize || topics.length >= result.count) {
      break;
    }
    const lastTopic = result.topics.at(-1);
    offsetTopic = lastTopic.id;
    offsetId = lastTopic.topMessage;
    offsetDate = (result.messages || []).find((message) => message.id === lastTopic.topMessage)?.date || 0;
  }
  return topics;
}

if (typeof process.env.TELEGRAM_USER_API_ID === 'string' && process.env.TELEGRAM_USER_API_ID.length > 0) {
  cache.setItem('apiId', parseInt(process.env.TELEGRAM_USER_API_ID));
}
if (typeof process.env.TELEGRAM_USER_API_HASH === 'string' && process.env.TELEGRAM_USER_API_HASH.length > 0) {
  cache.setItem('apiHash', process.env.TELEGRAM_USER_API_HASH);
}
if (typeof process.env.TELEGRAM_BOT_AUTH_TOKEN === 'string' && process.env.TELEGRAM_BOT_AUTH_TOKEN.length > botAuthTokenMinimumLength) {
  cache.setItem('botAuthToken', process.env.TELEGRAM_BOT_AUTH_TOKEN);
}

let apiId = cache.getItem('apiId', 'number');
let apiHash = cache.getItem('apiHash');
let botAuthToken = cache.getItem('botAuthToken');
let forwardRules = cache.getItem(forwardRulesId) || [];
let meUser = null;
let meBot = null;
let meUserId = -1;
let fromIds = [];
let fromIdsWithEdit = [];
let clientAsUser = null;
let clientAsBot = null;
let clientLogger = null;
let botLogger = null;
let allowedUsers = [];
let clientDialogs = [];
let refreshIntervalId = null;
let resubscribeIntervalId = null;
let menuRoot = null;
const fromToTypes = new Map([
  ['user', i18n.__('User')],
  ['bot', i18n.__('Bot')],
  ['group', i18n.__('Group')],
  ['channel', i18n.__('Channel')],
  ['topic', i18n.__('Topic')],
]);
const topicIdPresence = (item, path) => {
    const type = path.slice(0, -1).reduce((acc, key) => (acc[key] !== undefined ? acc[key] : null), item);
    return type?.type === 'topic' ? 'mandatory' : 'none';
  },
  getDialogId = async (data, key, force) => {
    const item = data[key],
      result = new Map();
    if (item !== undefined) {
      const type = item.type;
      if (force === true) {
        await refreshDialogs();
      }
      if (fromToTypes.has(type)) {
        let dialogs = [];
        switch (type) {
          case 'user': {
            dialogs = clientDialogs.filter(
              (dialog) => dialog.isGroup !== true && dialog.isChannel !== true && dialog.isUser === true && dialog.entity?.bot === false,
            );
            break;
          }
          case 'bot': {
            dialogs = clientDialogs.filter(
              (dialog) => dialog.isGroup !== true && dialog.isChannel !== true && dialog.isUser === true && dialog.entity?.bot === true,
            );
            break;
          }
          case 'group': {
            dialogs = clientDialogs.filter((dialog) => dialog.isGroup === true /* && dialog.isChannel !== true */ /* supergroup has isChannel = true */);
            break;
          }
          case 'channel': {
            dialogs = clientDialogs.filter((dialog) => dialog.isGroup !== true && dialog.isChannel === true);
            break;
          }
          case 'topic': {
            dialogs = clientDialogs.filter((dialog) => dialog.entity?.forum === true);
            break;
          }
        }
        dialogs.forEach((dialog) => {
          result.set(`${dialog.entity.id}`, dialog.title);
        });
      }
    }
    return result;
  },
  getForumTopics = async (entity) => {
    return new Promise((resolve, reject) => {
      if (entity !== null && entity !== undefined && entity.forum === true && clientAsUser !== null && clientAsUser.connected === true) {
        if (
          topicsCache[`${entity.id}`] !== undefined &&
          topicsCache[`${entity.id}`].timeStamp > 0 &&
          Date.now() - topicsCache[`${entity.id}`].timeStamp < refreshInterval
        ) {
          resolve(topicsCache[`${entity.id}`].topics);
        } else {
          getAllForumTopics(entity)
            .then((topics) => {
              topicsCache[`${entity.id}`] = {topics, timeStamp: Date.now()};
              resolve(topics);
            })
            .catch((err) => {
              log.warn(err, logAsUser);
              resolve([]);
            });
        }
      } else {
        resolve([]);
      }
    });
  },
  getTopics = async (data, key) => {
    const item = data[key],
      result = new Map();
    if (item !== undefined && clientAsUser !== null && clientAsUser.connected === true) {
      const entity = getEntityById(item?.id);
      if (entity?.forum === true) {
        const topics = await getForumTopics(entity);
        if (Array.isArray(topics) && topics.length > 0) {
          topics.forEach((topic) => {
            result.set(topic.id, topic.title);
          });
        }
      } else {
        log.warn(`No topics can be found for ${item.title}!`);
      }
    }
    return result;
  },
  onEnabledChange = (data, _key, value, _path) => {
    let result = true;
    if (value === true) {
      result = data.processMissedMaxCount !== undefined && data.processMissedMaxCount !== null;
      if (result === true) {
        for (const item of ['from', 'to']) {
          const dialog = getDialogById(data[item].id);
          if (dialog !== null && dialog !== undefined) {
            switch (data[item].type) {
              case 'user': {
                result =
                  dialog.isGroup !== true &&
                  dialog.isChannel !== true &&
                  dialog.isUser === true &&
                  typeof data[item].topicId !== 'number' &&
                  dialog.entity?.bot === false;
                break;
              }
              case 'bot': {
                result =
                  dialog.isGroup !== true &&
                  dialog.isChannel !== true &&
                  dialog.isUser === true &&
                  typeof data[item].topicId !== 'number' &&
                  dialog.entity?.bot === true;
                break;
              }
              case 'group': {
                result =
                  dialog.isGroup === true && /*dialog.isChannel !== true &&*/ /* supergroup is channel=true */ dialog.isUser !== true && typeof data[item].topicId !== 'number';
                break;
              }
              case 'channel': {
                result =
                  dialog.isGroup !== true && dialog.isChannel === true && dialog.isUser !== true && typeof data[item].topicId !== 'number';
                break;
              }
              case 'topic': {
                result = dialog.entity.forum === true && typeof data[item].topicId === 'number';
                break;
              }
            }
          }
          if (result === false) {
            break;
          }
        }
      }
    }
    return result;
  },
  forwardRuleStructure = {
    primaryId: (data, isShort = false) => `${data.label} ${data.enabled ? '✅' : '❌'}`,
    type: 'object',
    label: 'Forward Rule',
    text: 'Forward rule for messages',
    itemContent: {
      label: {
        type: 'string',
        presence: 'mandatory',
        editable: true,
        sourceType: 'input',
        label: 'Rule label',
        text: 'Rule identification label',
      },
      enabled: {
        type: 'boolean',
        presence: 'mandatory',
        editable: true,
        default: false,
        onSetBefore: onEnabledChange,
        label: 'Enabled',
        text: 'Enable/disable rule',
      },
      processReplyOnForwarded: {
        type: 'boolean',
        presence: 'mandatory',
        editable: true,
        default: false,
        onSetReset: ['enabled'],
        label: 'Process replay on forwarded message',
        text: 'Process (i.e. forward) reply on last forwarded message',
      },
      processEditsOnForwarded: {
        type: 'boolean',
        presence: 'mandatory',
        editable: true,
        default: false,
        onSetReset: ['enabled'],
        label: 'Process edits of forwarded message',
        text: 'Process (i.e. forward) edits of last forwarded message',
      },
      antiFastEditDelay: {
        type: 'number',
        subType: 'integer',
        options: {
          min: 0,
          max: 300,
          step: 1,
        },
        sourceType: 'input',
        presence: 'mandatory',
        editable: true,
        default: 0,
        onSetReset: ['enabled'],
        label: 'Anti fast edit delay',
        text: 'Delay to prevent multiple forwards of the same message due to fast edits on source side, in seconds',
      },
      processMissedMaxCount: {
        type: 'number',
        subType: 'integer',
        options: {
          min: 0,
          max: 100,
          step: 1,
        },
        sourceType: 'input',
        presence: 'mandatory',
        editable: true,
        default: 0,
        onSetReset: ['enabled'],
        label: 'Process missed messages',
        text: 'Process missed messages, max count is 100 messages per channel/group',
      },
      from: {
        type: 'object',
        presence: 'mandatory',
        editable: true,
        itemContent: {
          type: {
            type: 'string',
            presence: 'mandatory',
            editable: true,
            sourceType: 'list',
            source: fromToTypes,
            onSetReset: ['enabled', '.id', '.topicId'],
            label: 'Type of source',
            text: 'Type of source, i.e. chat/group/channel',
          },
          id: {
            type: 'string',
            presence: 'mandatory',
            editable: true,
            sourceType: 'list',
            sourceAsync: async (data, force) => await getDialogId(data, 'from', force),
            extraRefresh: true,
            onSetReset: ['enabled', '.topicId'],
            label: 'Source chat',
            text: 'Source name',
          },
          topicId: {
            type: 'number',
            presence: topicIdPresence,
            editable: true,
            sourceType: 'list',
            sourceAsync: async (data) => {
              return await getTopics(data, 'from');
            },
            onSetReset: ['enabled'],
            label: 'Source topic',
            text: 'Source topic name',
          },
        },
      },
      to: {
        type: 'object',
        presence: 'mandatory',
        editable: true,
        itemContent: {
          type: {
            type: 'string',
            presence: 'mandatory',
            editable: true,
            sourceType: 'list',
            source: fromToTypes,
            onSetReset: ['enabled', '.id', '.topicId'],
            label: 'Type of destination',
            text: 'Type of destination, i.e. chat/group/channel',
          },
          id: {
            type: 'string',
            presence: 'mandatory',
            editable: true,
            sourceType: 'list',
            sourceAsync: async (data, force) => await getDialogId(data, 'to', force),
            extraRefresh: true,
            onSetReset: ['enabled', '.topicId'],
            label: 'Destination chat',
            text: 'Destination chat/group/channel name',
          },
          topicId: {
            type: 'number',
            presence: topicIdPresence,
            editable: true,
            sourceType: 'list',
            sourceAsync: async (data) => {
              return await getTopics(data, 'to');
            },
            onSetReset: ['enabled'],
            label: 'Destination topic',
            text: 'Destination topic name',
          },
        },
      },
      keywordsGroups: {
        type: 'array',
        presence: 'mandatory',
        editable: true,
        default: [],
        label: 'Keywords groups',
        text: 'Keywords to be included or excluded in the message by groups',
        onSetReset: ['enabled'],
        structure: {
          primaryId: (data, isShort = false) => `(${i18n.__(data.includeAll ? 'All' : 'Some')}) ${data.label}`,
          itemContent: {
            label: {
              type: 'string',
              presence: 'mandatory',
              editable: true,
              sourceType: 'input',
              label: 'Keywords group label',
              text: 'Keywords group identification label',
            },
            includeAll: {
              type: 'boolean',
              presence: 'mandatory',
              editable: true,
              default: true,
              label: 'Included all',
              text: 'Included keywords must be present all or some',
              onSetReset: ['enabled'],
            },
            keywords: {
              type: 'array',
              presence: 'mandatory',
              editable: true,
              default: [],
              label: 'Keywords',
              text: 'Keywords in the group',
              onSetReset: ['enabled'],
              structure: {
                primaryId: (data, isShort = false) => `(${data.include ? '+' : '-'}) ${data.keyword}`,
                itemContent: {
                  keyword: {
                    type: 'string',
                    presence: 'mandatory',
                    editable: true,
                    sourceType: 'input',
                    label: 'Keyword item',
                    text: 'Keyword item, i.e. text string to be included or excluded',
                    onSetReset: ['enabled'],
                  },
                  include: {
                    type: 'boolean',
                    presence: 'mandatory',
                    editable: true,
                    default: true,
                    label: 'Included',
                    text: 'Is keyword has to be included or excluded in the message',
                    onSetReset: ['enabled'],
                  },
                },
              },
            },
          },
        },
      },
    },
  };

const menuRootStructure = {
  isRoot: true,
  id: 'start',
  label: i18n.__('Menu'),
  text: i18n.__('Menu'),
  options: {
    getValue: (key, type) => cache.getItem(key, type),
    setValue: (key, value) => cache.setItem(key, value),
    removeValue: (key) => cache.removeItem(key),
    columnsMaxCount: {default: configuration.menuColumnsMaxCount},
    textSummaryMaxLength: {default: configuration.textSummaryMaxLength},
    spaceBetweenColumns: {default: configuration.spaceBetweenColumns},
    buttonsMaxCount: {default: configuration.buttonsMaxCount},
  },
  structure: {
    [configurationId]: {
      type: 'object',
      label: i18n.__('Configuration'),
      structure: configurationStructure,
      save: () => {
        configuration = cache.getItem(configurationId, 'object');
        updateCommandListeners();
      },
    },
    [forwardRulesId]: {
      label: i18n.__('Forward Rules'),
      type: 'array',
      structure: forwardRuleStructure,
      save: refreshDialogsOnce,
    },
  },
};

function updateCommandListeners(force = false) {
  if (clientAsBot !== null && clientAsBot.connected === true) {
    const allowedUSersFromConfig = (configuration.users || []).filter((id) => typeof id === 'number'),
      allowedUsersFiltered = allowedUsers.filter((id) => typeof id === 'number' && id !== meUserId);
    if (
      force ||
      allowedUSersFromConfig.length !== allowedUsersFiltered.length ||
      allowedUSersFromConfig.some((id) => !allowedUsersFiltered.includes(id))
    ) {
      allowedUsers = [meUserId, ...allowedUSersFromConfig];
      const eventHandlers = clientAsBot.listEventHandlers();
      if (Array.isArray(eventHandlers) && eventHandlers.length > 0) {
        eventHandlers.forEach((item) => {
          clientAsBot.removeEventHandler(item[1], item[0]);
        });
      }
      log.info(`Listen on commands from : ${stringify(allowedUsers)}`, logAsBot);
      clientAsBot.addEventHandler(onCommand, new CallbackQuery({chats: allowedUsers}));
      clientAsBot.addEventHandler(onCommand, new NewMessage({chats: allowedUsers}));
    }
  }
}

function updateForwardListeners(force = false) {
  if (clientAsUser !== null && clientAsUser.connected === true) {
    // Several rules can have the same source, so the source ids are deduplicated
    const newFromIds = [...new Set(forwardRules.filter((rule) => rule.enabled).map((rule) => Number(rule.from.id)))],
      newFromIdsWithEdit = [
        ...new Set(forwardRules.filter((rule) => rule.enabled && rule.processEditsOnForwarded).map((rule) => Number(rule.from.id))),
      ];
    if (
      force ||
      fromIds.length !== newFromIds.length ||
      fromIds.some((id) => !newFromIds.includes(id)) ||
      fromIdsWithEdit.length !== newFromIdsWithEdit.length ||
      fromIdsWithEdit.some((id) => !newFromIdsWithEdit.includes(id))
    ) {
      //!  Fix for handlers cleanup
      const eventHandlers = clientAsUser.listEventHandlers();
      if (Array.isArray(eventHandlers) && eventHandlers.length > 0) {
        eventHandlers.forEach((item) => {
          clientAsUser.removeEventHandler(item[1], item[0]);
        });
      }
      fromIds = newFromIds;
      if (fromIds.length > 0) {
        log.info(`Starting listen on New Messages in : ${stringify(fromIds)}`, logAsUser);
        clientAsUser.addEventHandler(onMessageToForward, new NewMessage({chats: fromIds}));
      }
      fromIdsWithEdit = newFromIdsWithEdit;
      if (fromIdsWithEdit.length > 0) {
        log.info(`Starting listen on Edited Messages in : ${stringify(fromIdsWithEdit)}`, logAsUser);
        clientAsUser.addEventHandler((event) => onMessageToForward(event, false, true), new EditedMessage({chats: fromIdsWithEdit}));
      }
    }
  }
}

function getRulePendingForwards(ruleKey) {
  if (pendingForwards[ruleKey] === undefined) {
    pendingForwards[ruleKey] = new Map();
  }
  return pendingForwards[ruleKey];
}

function getRuleLastForwarded(rule) {
  // The state stored per source by earlier versions is used, until the rule forwards a message
  return getMessageState(lastForwarded[getRuleKey(rule)] ?? lastForwarded[rule.from.id]);
}

const forwardRetryMaxCount = 3;
const forwardRetryMaxWait = 3600; // seconds

/**
 * Forward the messages. The FloodWait longer than the client sleeps automatically (floodSleepThreshold) is waited and
 * the request is repeated, instead of losing the message.
 * @param {object} forwardMessageInput - The ForwardMessages request parameters
 * @param {string} logPrefix - The log prefix
 * @returns {Promise<object>} The request result
 **/
async function invokeForwardMessages(forwardMessageInput, logPrefix) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await clientAsUser.invoke(new Api.messages.ForwardMessages(forwardMessageInput));
    } catch (err) {
      if (typeof err?.seconds !== 'number' || err.seconds > forwardRetryMaxWait || attempt > forwardRetryMaxCount) {
        throw err;
      }
      log.warn(`${logPrefix}: Flood wait for ${err.seconds} seconds, forward is going to be repeated (attempt ${attempt})!`, logAsUser);
      await new Promise((resolve) => setTimeout(resolve, (err.seconds + 1) * 1000));
    }
  }
}

function forwardMessage(rule, fromPeer, sourceId, toPeer, messageId, message, messageEditDate, messageIds = [messageId]) {
  // All parts of an album (media group) have to be forwarded in one request, otherwise Telegram delivers them as separate messages
  const forwardMessageInput = {
    fromPeer: fromPeer,
    id: messageIds,
    toPeer: toPeer,
    randomId: messageIds.map(() => getRandomId()),
    silent: false,
    background: false,
    withMyScore: false,
    grouped: messageIds.length > 1,
    fromLive: false,
    useQuickAck: false,
    scheduleDate: null,
  };
  if (rule.to.topicId !== null && rule.to.topicId !== undefined) {
    forwardMessageInput.topMsgId = rule.to.topicId;
  }
  // Forwards to the same destination are sent one by one: parallel requests can be completed in any order,
  // so the messages were delivered not in the original order (i.e. missed messages after restart)
  const destinationKey = `${rule.to.id}:${rule.to.topicId ?? ''}`,
    forwarding = (forwardQueues[destinationKey] ?? Promise.resolve()).then(() =>
      invokeForwardMessages(forwardMessageInput, `[${rule.label}, ${sourceId}, ${messageId}]`),
    );
  forwardQueues[destinationKey] = forwarding.catch(() => null);
  return forwarding
    .then((res) => {
      log.info(`[${rule.label}, ${sourceId}, ${messageId}]: Message is forwarded successfully!`, logAsUser);
      if (messageId > (getMessageState(lastProcessed[rule.from.id])?.id || 0)) {
        lastProcessed[rule.from.id] = {id: messageId, editDate: messageEditDate};
        cache.setItem('lastProcessed', lastProcessed);
      }
      lastForwarded[getRuleKey(rule)] = {id: messageId, ids: messageIds, editDate: messageEditDate, message: message};
      cache.setItem('lastForwarded', lastForwarded);
    })
    .catch((err) => {
      log.warn(`[${rule.label}, ${sourceId}, ${messageId}]: ${err}`, logAsUser);
    });
}

// Album (media group) parts arrive as separate messages sharing the same groupedId, so they are collected for a short time
// and processed together
const albumCollectDelay = 1500;
const albumsPending = {};

function collectAlbumMessage(event, sourceId, onRefresh) {
  const albumKey = `${sourceId}:${event.message.groupedId}`;
  if (albumsPending[albumKey] === undefined) {
    albumsPending[albumKey] = {messages: new Map(), onRefresh: onRefresh, timeout: null};
  }
  const album = albumsPending[albumKey];
  album.messages.set(event.message.id, event.message);
  album.onRefresh = album.onRefresh && onRefresh;
  clearTimeout(album.timeout);
  album.timeout = setTimeout(() => {
    delete albumsPending[albumKey];
    const albumMessages = [...album.messages.values()].sort((a, b) => a.id - b.id);
    log.debug(
      `[${sourceId}]: Album ${event.message.groupedId} is collected: ${stringify(albumMessages.map((item) => item.id))}`,
      logAsUser,
    );
    onMessageToForward({message: albumMessages.at(-1)}, album.onRefresh, false, albumMessages);
  }, albumCollectDelay);
}

function onMessageToForward(event, onRefresh = false, onEdit = false, albumMessages = null) {
  const peerId = event.message?.peerId,
    sourceId = Number(peerId?.channelId || peerId?.userId || peerId?.chatId || 0),
    // For an album the caption is usually attached to only one of its parts, so the text of all parts is combined
    message =
      (Array.isArray(albumMessages)
        ? albumMessages
            .map((item) => item.message)
            .filter((item) => typeof item === 'string' && item !== '')
            .join('\n')
        : event.message.message) || '',
    messageEditDate = event.message.editDate || 0,
    messageIsString = Array.isArray(albumMessages) || typeof event.message.message === 'string';
  log.info(
    `[${sourceId}, ${event.message.id}]: Message in monitored channel/group via ${onRefresh ? 'refresh' : 'event'} ${
      onEdit ? 'onEdit' : 'onNew'
    }, message.date: ${event.message.date} (${printMessageDate(event.message.date)}), message.editDate: ${
      event.message.editDate
    } (${printMessageDate(messageEditDate)}), message: ${message}.`,
    logAsUser,
  );
  if (typeof peerId === 'object' && fromIds.includes(sourceId)) {
    // All enabled rules with this source are processed, each one with own topic, keywords and destination
    const rulesToProcess = getEnabledRulesForSource(forwardRules, sourceId)
      .map((rule) => ({rule, entityFrom: getEntityById(rule.from.id), entityTo: getEntityById(rule.to.id)}))
      .filter(
        ({rule, entityFrom, entityTo}) =>
          entityFrom !== null &&
          entityFrom !== undefined &&
          entityTo !== null &&
          entityTo !== undefined &&
          isMessageInRuleTopic(rule, entityFrom, event.message),
      );
    if (rulesToProcess.length === 0) {
      return;
    }
    if (onEdit === false && albumMessages === null && event.message.groupedId) {
      collectAlbumMessage(event, sourceId, onRefresh);
      return;
    }
    if (onEdit === false) {
      clientAsUser.markAsRead(rulesToProcess[0].entityFrom, event.message).catch((err) => {
        log.warn(`[${sourceId}, ${event.message.id}]: MarkAsRead error: ${stringify(err)}`, logAsUser);
      });
    }
    const forwards = [];
    for (const {rule, entityTo} of rulesToProcess) {
      const ruleKey = getRuleKey(rule),
        rulePendingForwards = getRulePendingForwards(ruleKey),
        ruleLastForwarded = getRuleLastForwarded(rule),
        sourceLastProcessed = getMessageState(lastProcessed[rule.from.id]);
      let messageId = event.message.id,
        messageIds = Array.isArray(albumMessages) ? albumMessages.map((item) => item.id) : [messageId];
      if (onEdit === true && event.message.groupedId) {
        // Edit of any album part is processed as an edit of the whole album
        const albumForwarded = [ruleLastForwarded, ...[...rulePendingForwards].map(([id, pending]) => ({id, ids: pending.ids}))].find(
          (item) => Array.isArray(item?.ids) && item.ids.includes(messageId),
        );
        if (albumForwarded !== undefined) {
          messageId = albumForwarded.id;
          messageIds = albumForwarded.ids;
        }
      }
      const lastForwardedId = ruleLastForwarded?.id || 0,
        lastForwardedEditDate = ruleLastForwarded?.editDate || 0,
        lastForwardedMessage = ruleLastForwarded?.message || '',
        lastProcessedId = sourceLastProcessed?.id || 0,
        lastProcessedEditDate = sourceLastProcessed?.editDate || 0,
        pendingForward = rulePendingForwards.get(messageId);
      if (onEdit === false && (pendingForward !== undefined || lastForwardedId === messageId)) {
        // I.e. the missed messages processing on refresh can meet the message, which is already handled by the event
        log.debug(`[${rule.label}, ${sourceId}, ${messageId}]: Message is already forwarded or waiting to be forwarded!`, logAsUser);
        continue;
      }
      let skipProcessing = onEdit === true && lastProcessedId !== messageId && lastForwardedId !== messageId && pendingForward === undefined;
      let toForward = false;
      if (onEdit === true) {
        if (lastForwardedId === messageId && lastForwardedEditDate < messageEditDate) {
          if (message !== lastForwardedMessage) {
            log.debug(
              `[${rule.label}, ${sourceId}, ${messageId}]: Forwarded message is edited and going to be checked by rules!`,
              logAsUser,
            );
          } else {
            skipProcessing = true;
            log.debug(
              `[${rule.label}, ${sourceId}, ${messageId}]: Forwarded message is edited but content is the same! Processing is skipped!`,
              logAsUser,
            );
          }
        }
        if (pendingForward !== undefined) {
          clearTimeout(pendingForward.timeout);
          rulePendingForwards.delete(messageId);
          log.info(
            `[${rule.label}, ${sourceId}, ${messageId}]: Message is edited before anti fast edit delay! Previous version will not be forwarded!`,
            logAsUser,
          );
        }
      }
      if (
        skipProcessing === false &&
        rule.processReplyOnForwarded === true &&
        event.message?.replyTo?.replyToMsgId !== undefined &&
        event.message.replyTo?.replyToMsgId === lastForwardedId
      ) {
        toForward = true;
        log.info(
          `[${rule.label}, ${sourceId}, ${messageId}]: Message is a reply on the last forwarded message! Going to forward it too.`,
          logAsUser,
        );
      } else if (skipProcessing === false && messageIsString && Array.isArray(rule.keywordsGroups) && rule.keywordsGroups.length > 0) {
        toForward = rule.keywordsGroups.some((keywordsGroup) => {
          const includes = keywordsGroup.keywords.filter((item) => item.include === true).map((item) => item.keyword),
            excludes = keywordsGroup.keywords.filter((item) => item.include === false).map((item) => item.keyword);
          let includesFound = false;
          if (keywordsGroup.includeAll === true) {
            includesFound = includes.length === 0 || includes.every((item) => message.includes(item));
            log.debug(`[${rule.label}, ${sourceId}, ${messageId}]: All includes are found: ${includesFound}`, logAsUser);
          } else {
            includesFound = includes.length === 0 || includes.some((item) => message.includes(item));
            log.debug(`[${rule.label}, ${sourceId}, ${messageId}]: Some includes are found: ${includesFound}`, logAsUser);
          }
          const excludesNotFound = excludes.length === 0 || excludes.find((item) => message.includes(item)) === undefined;
          log.debug(`[${rule.label}, ${sourceId}, ${messageId}]: No any exclude is found: ${excludesNotFound}`, logAsUser);
          return includesFound && excludesNotFound;
        });
        log.info(`[${rule.label}, ${sourceId}, ${messageId}]: Result of rules check to forward: ${toForward}`, logAsUser);
      }
      if (toForward) {
        if (rule.processEditsOnForwarded === true && rule.antiFastEditDelay > 0) {
          log.debug(
            `[${rule.label}, ${sourceId}, ${messageId}]: Message is going to be forwarded in ${rule.antiFastEditDelay} seconds!`,
            logAsUser,
          );
          // Each message has own timer, so the next message doesn't affect the waiting one
          rulePendingForwards.set(messageId, {
            ids: messageIds,
            timeout: setTimeout(() => {
              rulePendingForwards.delete(messageId);
              forwardMessage(rule, peerId, sourceId, entityTo, messageId, message, messageEditDate, messageIds);
            }, rule.antiFastEditDelay * 1000),
          });
        } else {
          forwards.push(forwardMessage(rule, peerId, sourceId, entityTo, messageId, message, messageEditDate, messageIds));
        }
      } else {
        log.debug(`[${rule.label}, ${sourceId}, ${messageId}]: Message is not forwarded! See reasons above.`, logAsUser);
        if (messageId > lastProcessedId || (messageId === lastProcessedId && messageEditDate > lastProcessedEditDate)) {
          lastProcessed[rule.from.id] = {id: messageId, editDate: messageEditDate || 0};
          cache.setItem('lastProcessed', lastProcessed);
        }
      }
    }
    // Resolved when the immediate forwards are done, i.e. to process the missed messages in order
    return Promise.all(forwards);
  }
}


function parseEvent(event) {
  let result = null;
  if (event instanceof CallbackQueryEvent) {
    const {userId, peer, msgId: messageId, data} = event.query;
    log.debug(`parseEvent | CallBack | userId: ${userId}, messageId: ${messageId}, data: ${data}`, logAsBot);
    if (data !== undefined) {
      result = {userId, peer, messageId, command: data.toString(), isEvent: true};
    }
  } else if (event instanceof NewMessageEvent) {
    const {peerId: peer, id: messageId, message: command} = event.message;
    log.debug(`parseEvent | userId: ${peer.userId}, messageId: ${messageId}, command: ${command}`, logAsBot);
    if (command !== undefined && peer.userId !== undefined) {
      result = {userId: peer.userId, peer, messageId, command, isEvent: false};
    }
  }
  return result;
}


function onCommand(event) {
  const parsedEvent = parseEvent(event);
  if (parsedEvent !== null) {
    const {userId, messageId, command, isEvent} = parsedEvent;
    log.debug(`onCommand | userId: ${userId}, messageId: ${messageId}, command: ${command}, isEvent: ${isEvent}`, logAsBot);
    if (userId !== undefined && allowedUsers.includes(Number(userId))) {
      menuRoot.onCommand(event, userId, messageId, command, isEvent).catch((err) => {
        log.warn(`onCommand | Command "${command}" failed! Error is ${stringify(err)}`, logAsBot);
      });
    }
  } else {
    log.warn(`onCommand | Unknown event: ${event.constructor.name}!`, logAsBot);
  }
}


function startBotClient() {
  if (options.noBot !== true && botAuthToken !== null) {
    clientAsBot
      .start({
        botAuthToken: botAuthToken,
        onError: (err) => {
          log.warn(err, logAsBot);
        },
      })
      .then(() => {
        clientAsBot
          .isUserAuthorized()
          .then((isAuthorized) => {
            log.info(`Is authorized: ${isAuthorized}`, logAsBot);
            cache.setItem('botStartTimeStamp', Date.now());
            clientAsBot.getMe().then((user) => {
              meBot = user;
              updateCommandListeners(true);
              if (Array.isArray(clientDialogs) && clientDialogs.length > 0) {
                const items = clientDialogs.filter((dialog) => dialog.isUser && `${dialog.id}` === `${meBot.id}`);
                if (items.length === 0 && meUser !== null) {
                  log.info(`Chat with bot is not open!`, logAsBot);
                  clientAsUser
                    .getInputEntity(meBot.username)
                    .then((botId) => {
                      log.debug(`Entity: ${stringify(botId)}`, logAsUser);
                      clientAsUser
                        .sendMessage(botId, {message: '/start'})
                        // eslint-disable-next-line sonarjs/no-nested-functions
                        .then((msg) => {
                          log.debug(`Message to the chat with bot sent successfully!`, logAsUser);
                        })
                        // eslint-disable-next-line sonarjs/no-nested-functions
                        .catch((err) => {
                          log.warn(`Can't send message to the bot! Error is ${stringify(err)}`, logAsUser);
                        });
                    })
                    .catch((err) => {
                      log.warn(`Can't get bot entity! Error is ${stringify(err)}`, logAsBot);
                    });
                } else if (items.length > 0) {
                  log.debug(`Chat with bot is already started!`, logAsBot);
                }
              }
            }).catch((err) => {
              log.warn(`Can't get bot info! Error is ${stringify(err)}`, logAsBot);
            });
          })
          .catch((err) => {
            log.warn(`Bot is not authorized! Error is ${stringify(err)}`, logAsBot);
          });
      })
      .catch((err) => {
        log.warn(`Bot can't connect! Error is ${stringify(err)}`, logAsBot);
        if (typeof err.seconds === 'number') {
          log.warn(`Bot will try to connect in ${err.seconds} seconds!`, logAsBot);
          setTimeout(() => {
            startBotClient();
          }, err.seconds * 1000);
        }
      });
  }
}

process.on('SIGINT', gracefulExit);
process.on('SIGTERM', gracefulExit);
// Any not handled error (i.e. Telegram API error on the menu drawing) is logged, instead of the process termination
process.on('unhandledRejection', (reason) => {
  log.error(`Unhandled rejection: ${stringify(reason)}`);
});

i18n.setLocale(configuration.language);
cache.registerEventForItem(forwardRulesId, Cache.eventSet, () => updateForwardListeners());

menuRoot = new MenuItemRoot(menuRootStructure);
menuRoot
  .init({
    makeButton: (label, command) => Button.inline(label || '?', Buffer.from(command)),
    sendMessageAsync: async (event, messageText, messageButtons) => {
      if (clientAsBot !== null && clientAsBot.connected === true) {
        const messageObject = {message: messageText, buttons: messageButtons};
        const {peer} = parseEvent(event) || {};
        if (peer !== undefined) {
          const message = await clientAsBot.sendMessage(peer, messageObject);
          return message?.id || 0;
        }
      }
      return 0;
    },
    editMessageAsync: async (event, messageId, messageText, messageButtons) => {
      if (clientAsBot !== null && clientAsBot.connected === true) {
        const messageObject = {message: messageId, text: messageText, buttons: messageButtons};
        const {peer} = parseEvent(event) || {};
        if (peer !== undefined) {
          return await clientAsBot.editMessage(peer, messageObject);
        }
      }
      return null;
    },
    deleteMessageAsync: async (event, messageId) => {
      if (clientAsBot !== null && clientAsBot.connected === true) {
        const {peer} = parseEvent(event) || {};
        if (peer !== undefined) {
          return await clientAsBot.deleteMessages(peer, [messageId], {revoke: true});
        }
      }
      return null;
    },
    confirmCallBackQueryAsync: async (event) => {
      if (clientAsBot !== null && clientAsBot.connected === true && typeof event?.query?.queryId !== undefined) {
        return await event.answer();
      }
      return null;
    },
    logLevel: options.noDebugMenu === true ? 'info' : '',
    logger: log,
    i18n,
  })
  .then(() => {
    if (options.command !== undefined) {
      log.debug(`Testing command: ${options.command}`);
      menuRoot.onCommand(null, 0, 0, options.command).catch((err) => {
        log.error(`Testing command failed! Error is ${stringify(err)}`);
      });
    } else {
      getAPIAttributes().then(() => {
        if (typeof apiId === 'number' && apiId !== 0 && typeof apiHash === 'string' && apiHash !== '') {
          clientLogger = new SecuredLogger('info');
          if (options.plainLogs) {
            clientLogger.setColorsEnabled(false);
          }
          clientAsUser = new TelegramClient(storeSession, apiId, apiHash, {
            connectionRetries: Infinity,
            autoReconnect: true,
            appVersion: scriptVersion,
            baseLogger: clientLogger,
          });
          clientAsUser.setParseMode('html');
          if (options.debugClientUser === true) clientAsUser.setLogLevel('debug');
          if (options.noBot !== true) {
            botLogger = new SecuredLogger('info');
            if (options.plainLogs) {
              botLogger.setColorsEnabled(false);
            }
            // The bot session is stored to not log in the bot on each start (it can lead to FloodWait on restarts);
            // it is per token, so a new token starts with a new session
            const botSessionName = `data/bot-session-${createHash('sha256').update(botAuthToken).digest('hex').slice(0, 12)}`;
            clientAsBot = new TelegramClient(new StoreSession(botSessionName), apiId, apiHash, {
              connectionRetries: Infinity,
              autoReconnect: true,
              appVersion: scriptVersion,
              baseLogger: botLogger,
            });
            clientAsBot.setParseMode('html');
            if (options.debugClientBot === true) clientAsBot.setLogLevel('debug');
          }
          const rl = readline.createInterface({
            input,
            output,
          });
          rl.on('SIGINT', gracefulExit);
          clientAsUser
            .start({
              phoneNumber: async () => {
                if (isInteractive === false && options.loginQr !== true) {
                  // The QR code login is possible without a terminal (the QR code is in the log), the login code is not
                  throw loginRequiredError('The Telegram user is not logged in, or the session is terminated by Telegram');
                }
                const phoneNumber = options.loginQr
                  ? 'qr'
                  : (await rl.question('Enter your phone number (or "qr" to log in via QR code): ')).trim();
                if (phoneNumber.toLowerCase() === 'qr') {
                  // On this error teleproto switches to the QR code login, i.e. the qrCode callback below
                  const qrLoginRequest = new Error('Log in via QR code');
                  qrLoginRequest.errorMessage = 'RESTART_AUTH_WITH_QR';
                  throw qrLoginRequest;
                }
                return phoneNumber;
              },
              qrCode: async ({token, expires}) => printLoginQrCode(token, expires),
              password: async (hint) => {
                if (isInteractive === false) {
                  throw loginRequiredError('The two-step verification password is required');
                }
                const hintText = hint ? ` (hint: ${hint})` : '';
                return rl.question(`Enter your password${hintText}: `);
              },
              phoneCode: async () => rl.question('Enter the code: '),
              onError: (err) => {
                if (err?.loginRequired === true) {
                  throw err;
                }
                log.warn(err, logAsUser);
                throw new Error("Can't login user client!");
              },
            })
            .then((connect) => {
              rl.close();
              clientAsUser
                .isUserAuthorized()
                .then((isAuthorized) => {
                  log.info(`User is authorized: ${isAuthorized}`, logAsUser);
                  clientAsUser.getMe().then((user) => {
                    meUser = user;
                    if (meUser !== null) {
                      meUserId = Number(meUser.id);
                    }
                    refreshDialogsInit(true);
                    resubscribeInit();
                    const lastBotStartTimeStamp = cache.getItem('botStartTimeStamp', 'number');
                    let timeOut = typeof lastBotStartTimeStamp === 'number' ? Date.now() - lastBotStartTimeStamp : 0;
                    log.debug(
                      `Bot flood prevention timeout: ${timeOut} ms, lastBotStartTimeStamp: ${lastBotStartTimeStamp},` +
                        ` now: ${Date.now()}`,
                    );
                    if (timeOut >= timeOutToPreventBotFlood) {
                      timeOut = 0;
                    } else if (timeOut > 0) {
                      timeOut = timeOutToPreventBotFlood - timeOut;
                    }
                    if (timeOut > 0) {
                      log.debug(`Bot flood prevention timeout: ${timeOut} ms`);
                      // eslint-disable-next-line sonarjs/no-nested-functions
                      setTimeout(() => {
                        startBotClient();
                      }, timeOut);
                    } else {
                      startBotClient();
                    }
                  }).catch((err) => {
                    log.warn(`Can't get user info! Error is ${stringify(err)}`, logAsUser);
                  });
                })
                .catch((err) => {
                  log.warn(`User is not authorized! Error is ${stringify(err)}`, logAsUser);
                });
            })
            .catch((err) => {
              rl.close();
              if (err?.loginRequired === true) {
                exitLoginRequired(err.message);
              } else {
                log.warn(`User can't connect! Error is ${stringify(err)}`, logAsUser);
              }
            });
        }
      }).catch((err) => {
        if (err?.loginRequired === true) {
          exitLoginRequired(err.message);
        } else {
          log.error(`Can't get API attributes! Error is ${stringify(err)}`);
        }
      });
    }
  })
  .catch((err) => {
    log.error(`Error on menuRoot.init(): ${stringify(err)}`);
  });

function getRandomId() {
  // Random 64-bit id, the time based one could be duplicated within a millisecond (RANDOM_ID_DUPLICATE, i.e. lost forward)
  return randomBytes(8).readBigInt64LE();
}

function printMessageDate(date) {
  return new Date(date * 1000).toString();
}

/**
 * Print the QR code for the user login. It is refreshed by teleproto until it is scanned.
 * Printed directly to stdout (not via logger) to keep the QR code intact, it is visible in `docker logs` too.
 * @param {Buffer} token - The login token
 * @param {number} expires - The token expiration time, Unix time in seconds
 **/
function printLoginQrCode(token, expires) {
  const loginUrl = `tg://login?token=${Buffer.from(token).toString('base64url')}`;
  qrcode.generate(loginUrl, {small: true}, (qrCodeText) => {
    console.log(
      [
        '',
        'Scan the QR code in the Telegram app: Settings -> Devices -> Link Desktop Device',
        qrCodeText,
        `The QR code is valid until ${new Date(expires * 1000).toLocaleTimeString()}, a new one will be shown automatically.`,
        '',
      ].join('\n'),
    );
  });
}

function getDialogById(id) {
  let result = null;
  if (typeof id === 'string' && Array.isArray(clientDialogs) && clientDialogs.length > 0) {
    result = clientDialogs.find((dialog) => id === `${dialog.entity.id}`);
  }
  return result;
}

function getEntityById(id) {
  const dialog = getDialogById(id);
  return dialog !== undefined && dialog !== null ? dialog.entity : null;
}

async function getAPIAttributes() {
  const apiCredentialsMissing = typeof apiId !== 'number' || apiId === 0 || typeof apiHash !== 'string' || apiHash.length === 0,
    botAuthTokenMissing =
      options.noBot !== true && (typeof botAuthToken !== 'string' || botAuthToken.length < botAuthTokenMinimumLength);
  if (apiCredentialsMissing || botAuthTokenMissing) {
    if (isInteractive === false) {
      throw loginRequiredError(
        apiCredentialsMissing
          ? 'The Telegram API credentials (TELEGRAM_USER_API_ID, TELEGRAM_USER_API_HASH) are not set'
          : 'The bot auth token (TELEGRAM_BOT_AUTH_TOKEN) is not set',
      );
    }
    const rl = readline.createInterface({
      input,
      output,
    });
    rl.on('SIGINT', gracefulExit);
    if (apiCredentialsMissing) {
      const id = await rl.question('Enter your API ID: ');
      apiId = parseInt(id);
      cache.setItem('apiId', apiId);
      apiHash = await rl.question('Enter your API Hash: ');
      cache.setItem('apiHash', apiHash);
    }
    if (botAuthTokenMissing) {
      botAuthToken = await rl.question('Enter your Bot Auth Token: ');
      cache.setItem('botAuthToken', botAuthToken);
    }
    rl.close();
  }
  return Promise.resolve();
}

async function processClientExit(clients, exitCode = 0) {
  if (clientAsUser?.connected === true) {
    cache.setItem(lastActiveTimeStampId, Date.now());
  }
  for (const client of clients) {
    if (client !== null && client.connected === true) {
      const logAs = client === clientAsBot ? logAsBot : logAsUser;
      try {
        await client.disconnect();
        log.info(`Client is disconnected!`, logAs);
        await client.destroy();
        log.info(`Client is destroyed!`, logAs);
      } catch (err) {
        log.warn(`Client is not disconnected properly! Error is ${stringify(err)}`, logAs);
      }
    }
  }
  log.info('All clients are disconnected! Exiting ...');
  exit(exitCode);
}

const exitTimeout = 5000;
let exitInProgress = false;

function gracefulExit(exitCode) {
  // As a signal handler it is called with the signal name
  const code = typeof exitCode === 'number' ? exitCode : 0;
  if (exitInProgress === false) {
    exitInProgress = true;
    // Disconnection can hang (i.e. on the client which is not logged in), so the process is terminated after the timeout anyway
    setTimeout(() => {
      log.warn(`Clients are not disconnected in ${exitTimeout / 1000} seconds! Exiting ...`);
      exit(code);
    }, exitTimeout);
    processClientExit([clientAsBot, clientAsUser], code);
  }
}

// The questions (API credentials, login) can be answered only with a terminal, i.e. not in a Docker container without "-it"
const isInteractive = input.isTTY === true;

function loginRequiredError(reason) {
  const error = new Error(reason);
  error.loginRequired = true;
  return error;
}

/**
 * Stop the application, as the login data can't be entered without a terminal, and explain how to log in
 * @param {string} reason - What is missing
 **/
function exitLoginRequired(reason) {
  log.error(`${reason}! The missing data can't be entered without a terminal (i.e. Docker container started without "-it").`);
  log.error('Run the application once interactively with the same data directory to log in, i.e.:');
  log.error('  docker run -it --rm -v $(pwd)/data:/app/data petrovoronov/telegram-forward-user-bot --login-qr');
  log.error('  npm start -- --login-qr');
  log.error('The API credentials and the bot token can be passed as environment variables too. See "User login" in README.md.');
  gracefulExit(1);
}

/**
 * Check if the source or destination topic of the rule still exists
 * @param {object} rule - The forwarding rule
 * @param {string} key - 'from' or 'to'
 * @param {object} dialog - The dialog of the source or destination chat
 * @returns {Promise<boolean>} True if the topic exists, or the rule has no topic
 **/
async function isRuleTopicAvailable(rule, key, dialog) {
  const topicId = rule[key].topicId;
  if (topicId === null || topicId === undefined) {
    return true;
  }
  if (dialog?.entity?.forum !== true) {
    log.warn(`[${rule.label}]: Chat ${dialog?.title ?? rule[key].id} is not found or is not a forum!`, logAsUser);
    return false;
  }
  // Requested by id, as the list of topics is returned by pages and the topic can be not on the first one
  const forum = await clientAsUser.invoke(new Api.messages.GetForumTopicsByID({peer: dialog.entity, topics: [topicId]}));
  const isFound = Array.isArray(forum?.topics) && forum.topics.some((topic) => topic instanceof Api.ForumTopic && topic.id === topicId);
  if (isFound === false) {
    log.warn(`[${rule.label}]: Topic with id ${topicId} is not found in ${dialog.title}!`, logAsUser);
  }
  return isFound;
}

/**
 * Process the edits of the last forwarded or processed message and the messages missed while the application was not running
 * @param {object} rule - The forwarding rule
 * @param {object} dialogFrom - The dialog of the source chat
 **/
async function processRuleMissedMessages(rule, dialogFrom) {
  if (rule.enabled !== true || rule.from.id !== `${dialogFrom?.entity?.id}`) {
    return;
  }
  const sourceLastProcessed = getMessageState(lastProcessed[rule.from.id]),
    lastProcessedId = sourceLastProcessed?.id || 0,
    lastProcessedEditDate = sourceLastProcessed?.editDate || 0,
    lastSourceId = dialogFrom.dialog?.topMessage;
  if (rule.processEditsOnForwarded === true) {
    const ruleLastForwarded = getRuleLastForwarded(rule),
      lastForwardedId = ruleLastForwarded?.id || 0,
      lastForwardedEditDate = ruleLastForwarded?.editDate || 0;
    for (const [messageId, knownEditDate, description] of [
      [lastForwardedId, lastForwardedEditDate, 'last forwarded'],
      [lastProcessedId !== lastForwardedId ? lastProcessedId : 0, lastProcessedEditDate, 'last processed'],
    ]) {
      if (messageId !== 0) {
        const [message] = await clientAsUser.getMessages(dialogFrom, {ids: messageId});
        if (typeof message === 'object' && message !== null) {
          const messageDate = message.date || 0,
            messageEditDate = message.editDate || 0;
          log.debug(
            `[${rule.label}]: In "${dialogFrom.title}" ${description} message - id: ${message.id}, message.date: ${printMessageDate(
              messageDate,
            )}, message.editDate: ${printMessageDate(messageEditDate)}, known editDate: ${printMessageDate(knownEditDate)}`,
            logAsUser,
          );
          if (messageEditDate > messageDate && messageEditDate > knownEditDate) {
            log.debug(`[${rule.label}]: In "${dialogFrom.title}" ${description} message is edited - id: ${message.id}`, logAsUser);
            await onMessageToForward({message}, true, true);
          }
        }
      }
    }
  }
  if (typeof lastActiveOnStart !== 'number' || lastProcessedId === 0) {
    // First start with this version (or the source is not processed yet): the missed messages are counted from now
    if (typeof lastSourceId === 'number' && lastSourceId > lastProcessedId) {
      lastProcessed[rule.from.id] = {id: lastSourceId, editDate: 0};
      cache.setItem('lastProcessed', lastProcessed);
    }
  } else if (typeof lastSourceId === 'number' && lastProcessedId < lastSourceId) {
    log.debug(
      `[${rule.label}]: In "${dialogFrom.title}" the last processed message id: ${lastProcessedId}, last source message id: ${lastSourceId}`,
      logAsUser,
    );
    // Messages newer than the last processed one. Works for all chat types: in private chats and basic groups the message ids
    // are counted per account, not per chat, so the range of ids between the last processed and the last message is not usable
    const messages = await clientAsUser.getMessages(dialogFrom.entity, {minId: lastProcessedId, limit: rule.processMissedMaxCount});
    if (Array.isArray(messages)) {
      // Received from the newest one, forwarded one by one from the oldest one, to keep the order in the destination
      for (const message of [...messages].sort((first, second) => first.id - second.id)) {
        const messageSourceId = message.peerId?.channelId || message.peerId?.userId || message.peerId?.chatId;
        if (rule.from.id !== `${messageSourceId}`) {
          log.warn(`[${rule.label}]: Message - id: ${message.id} is not from the rule source, skipped!`, logAsUser);
          continue;
        }
        if (message.date * 1000 < lastActiveOnStart - missedMessagesTimeMargin) {
          log.debug(`[${rule.label}]: Message - id: ${message.id} is older than the last application activity, skipped!`, logAsUser);
          continue;
        }
        log.debug(`[${rule.label}]: Missed message - id: ${message.id}, message: ${message.message}`, logAsUser);
        await onMessageToForward({message}, true);
      }
    }
    // The skipped outdated messages are not checked again
    if (lastSourceId > (getMessageState(lastProcessed[rule.from.id])?.id || 0)) {
      lastProcessed[rule.from.id] = {id: lastSourceId, editDate: 0};
      cache.setItem('lastProcessed', lastProcessed);
    }
  }
}

async function refreshDialogsRun() {
  if (clientAsUser === null || clientAsUser.connected !== true) {
    clientDialogs = [];
    throw new Error('User client is not connected!');
  }
  const dialogs = await clientAsUser.getDialogs();
  forwardRules = cache.getItem(forwardRulesId) || [];
  if (Array.isArray(dialogs) === false || dialogs.length === 0) {
    clientDialogs = [];
    log.warn(`No dialogs found!`, logAsUser);
    throw new Error(`Can't get dialogs!`);
  }
  clientDialogs = dialogs.filter((dialog) => dialog.entity?.migratedTo === undefined || dialog.entity?.migratedTo === null);
  const groupsOrChannels = dialogs.filter((dialog) => dialog.isChannel || dialog.isGroup),
    filteredRules = forwardRules.filter((rule) => rule.enabled);
  for (const rule of filteredRules) {
    // Each rule is processed separately, so the error in one of them (i.e. FloodWait) doesn't stop the others
    try {
      // Source can be any chat (i.e. user or bot), the destination - only group or channel
      const dialogFrom = dialogs.find((item) => rule.from.id === `${item.entity.id}`),
        dialogTo = groupsOrChannels.find((item) => rule.to.id === `${item.entity.id}`);
      if ((await isRuleTopicAvailable(rule, 'from', dialogFrom)) === false || (await isRuleTopicAvailable(rule, 'to', dialogTo)) === false) {
        log.warn(`[${rule.label}]: Rule is disabled, as the topic is not available!`, logAsUser);
        rule.enabled = false;
      } else if (dialogFrom !== undefined && dialogFrom !== null) {
        if (rule.processMissedMaxCount > 0) {
          await processRuleMissedMessages(rule, dialogFrom);
        } else {
          const lastSourceId = dialogFrom.dialog?.topMessage;
          if (typeof lastSourceId === 'number' && lastSourceId > (getMessageState(lastProcessed[rule.from.id])?.id || 0)) {
            lastProcessed[rule.from.id] = {id: lastSourceId, editDate: 0};
            cache.setItem('lastProcessed', lastProcessed);
          }
        }
      }
    } catch (err) {
      log.warn(`[${rule.label}]: Refresh of the rule is failed! Error is ${stringify(err)}`, logAsUser);
    }
  }
  // Saving the rules triggers updateForwardListeners(), which subscribes on the changed sources
  cache.setItem(forwardRulesId, forwardRules);
  cache.setItem(lastActiveTimeStampId, Date.now());
  log.debug(
    `Dialogs refreshed! Dialogs: ${dialogs.length}, filteredRules: ${filteredRules.length}, IdsToMonitor: ${stringify(fromIds)}`,
    logAsUser,
  );
  return true;
}

let refreshDialogsRunning = null,
  refreshDialogsQueued = null;

/**
 * Refresh the dialogs and process the missed messages. It is started by the interval, by the menu and on the rules save,
 * so the overlapping calls are joined: one more run is done after the current one, instead of the parallel processing.
 * @returns {Promise<boolean>} Resolved with true when the dialogs are refreshed
 **/
function refreshDialogs() {
  if (refreshDialogsRunning === null) {
    refreshDialogsRunning = refreshDialogsRun().finally(() => {
      refreshDialogsRunning = null;
    });
    return refreshDialogsRunning;
  }
  if (refreshDialogsQueued === null) {
    refreshDialogsQueued = refreshDialogsRunning
      .catch(() => false)
      .then(() => {
        refreshDialogsQueued = null;
        return refreshDialogs();
      });
  }
  return refreshDialogsQueued;
}

function refreshDialogsOnce() {
  refreshDialogs().catch((err) => {
    log.warn(`refreshDialogs error: ${stringify(err)}`, logAsUser);
  });
}

function refreshDialogsInit(isInitial = false) {
  if (isInitial) refreshDialogsOnce();
  if (refreshIntervalId !== undefined && refreshIntervalId !== null) clearInterval(refreshIntervalId);
  refreshIntervalId = setInterval(refreshDialogsOnce, refreshInterval);
}

function resubscribe() {
  updateForwardListeners(true);
}

function resubscribeInit() {
  resubscribe();
  if (resubscribeIntervalId !== undefined && resubscribeIntervalId !== null) clearInterval(resubscribeIntervalId);
  resubscribeIntervalId = setInterval(resubscribe, resubscribeInterval);
}
