const {Api, TelegramClient} = require('telegram');
const {StringSession, StoreSession} = require('telegram/sessions');
const {Button} = require('telegram/tl/custom/button');
const readline = require('node:readline/promises');
const {stdin: input, stdout: output, exit} = require('node:process');
const stringify = require('json-stringify-safe');
const {LocalStorage} = require('node-localstorage');
const {menuDefaults, MenuItemRoot} = require('telegram-menu-from-structure');
const {Cache} = require('./modules/cache/Cache');
const yargs = require('yargs');
const {setTimeout} = require('node:timers');
const {securedLogger: log} = require('./modules/logging/logging');
const {NewMessage, NewMessageEvent} = require('telegram/events');
const {EditedMessage} = require('telegram/events/EditedMessage');
const {CallbackQuery, CallbackQueryEvent} = require('telegram/events/CallbackQuery');
const {name: scriptName, version: scriptVersion} = require('./version');
const i18n = require('./modules/i18n/i18n.config');
const {isBot} = require('telegram/client/users');

const refreshIntervalDefault = 300;
const resubscribeIntervalDefault = 60;
let refreshInterval = refreshIntervalDefault * 1000;
let resubscribeInterval = resubscribeIntervalDefault * 60 * 1000;

const options = yargs
  .usage('Usage: $0 [options]')
  .option('r', {
    alias: 'refresh-interval',
    describe: 'Refresh information from Telegram servers, in seconds',
    type: 'number',
    default: refreshIntervalDefault,
    demandOption: false,
  })
  .option('s', {
    alias: 'resubscribe-interval',
    describe: 'Resubscribe on changes in sources chats, in minutes',
    type: 'number',
    default: resubscribeIntervalDefault,
    demandOption: false,
  })
  .option('b', {
    alias: 'no-bot',
    describe: 'Start without the bot instance',
    type: 'boolean',
    demandOption: false,
  })
  .option('d', {
    alias: 'debug',
    describe: 'Debug level of logging',
    type: 'boolean',
    demandOption: false,
  })
  .option('debug-client-user', {
    describe: 'Debug level of logging for the client "user" instance',
    type: 'boolean',
    demandOption: false,
  })
  .option('debug-client-bot', {
    describe: 'Debug level of logging for the client "bot" instance',
    type: 'boolean',
    demandOption: false,
  })
  .option('c', {
    alias: 'command',
    describe: 'Test menu command from the command line',
    type: 'string',
    demandOption: false,
  })
  .version(scriptVersion)
  .help('h')
  .alias('h', 'help')
  .epilog(`${scriptName} v${scriptVersion}`).argv;

if (options.debug) {
  log.setLevel('debug');
}

log.appendMaskWord('apiId', 'apiHash', 'DeviceSN', 'ClientId', 'phone');

const logAsBot = {isBot: true};
const logAsUser = {isBot: false};

log.info(`${scriptName} v${scriptVersion} started!`);
log.info(`Refresh interval: ${options.refreshInterval} seconds!`);
log.info(`Resubscribe interval: ${options.resubscribeInterval} minutes!`);
log.info(`Process missed messages: ${options.processMissed ? 'not more than ' + options.processMissed : 'disabled'}.`);
if (options.noBot === true) log.info('Starting without bot instance!');
if (options.debug === true) log.info('Verbose logging is enabled!');
if (options.command !== undefined) log.info(`Command to test: ${options.command}`);

const getLanguages = () => {
    return new Map(i18n.getLocales().map((locale) => [locale, locale]));
  },
  onLanguageChange = (currentItem, key, data, path) => {
    i18n.setLocale(data.language);
    return true;
  },
  onRefreshIntervalChange = (currentItem, key, data, path) => {
    if (refreshIntervalSetOnStart === false) {
      refreshInterval = (data?.refreshInterval || 300) * 1000;
      refreshDialogsInit();
    }
  },
  onResubscribeIntervalChange = (currentItem, key, data, path) => {
    const newResubscribeInterval = (data?.resubscribeInterval || 60) * 60 * 1000;
    if (newResubscribeInterval !== resubscribeInterval) {
      resubscribeInterval = newResubscribeInterval;
      resubscribeInit();
    }
  },
  onMenuColumnsMaxCountChange = (currentItem, key, data, path) => {
    if (menuRoot !== null && menuRoot !== undefined) {
      menuRoot.menuColumnsMaxCount = data?.menuColumnsMaxCount || 0;
    }
  },
  onTextSummaryMaxLengthChange = (currentItem, key, data, path) => {
    if (menuRoot !== null && menuRoot !== undefined) {
      menuRoot.textSummaryMaxLength = data?.textSummaryMaxLength || 0;
    }
  },
  onSpaceBetweenColumnsChange = (currentItem, key, data, path) => {
    if (menuRoot !== null && menuRoot !== undefined) {
      menuRoot.spaceBetweenColumns = data?.spaceBetweenColumns || 1;
    }
  },
  onButtonMaxCountChange = (currentItem, key, data, path) => {
    if (menuRoot !== null && menuRoot !== undefined) {
      menuRoot.buttonsMaxCount = data?.buttonsMaxCount || 10;
    }
  },
  /**
   * Represents the configuration structure for the menu.
   *
   * @typedef {Object} ConfigurationStructure
   * @property {string} language - The language of the menu.
   * @property {number} processMissedMaxCount - The maximum count of missed messages to process per channel/group.
   * @property {number} menuColumnsMaxCount - The maximum count of columns in one row of the menu.
   * @property {number} textSummaryMaxLength - The approximate maximum length of the text in one row of the menu.
   * @property {number} spaceBetweenColumns - The space between columns in the menu.
   * @property {number} buttonsMaxCount - The maximum count of buttons on one "page" of the menu.
   */
  configurationStructure = {
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
          min: 30,
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
          min: 30,
          max: 180,
          step: 10,
        },
        sourceType: 'input',
        presence: 'mandatory',
        editable: true,
        onSetAfter: onRefreshIntervalChange,
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
              source: () => {
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
              label: 'User Name',
              text: 'User Name to be allowed to use the bot',
            },
          },
        },
      },
    },
  },
  storage = new LocalStorage('data/storage'),
  cache = new Cache({
    getItem: (key) => storage.getItem(key),
    setItem: (key, value) => storage.setItem(key, value),
    removeItem: (key) => storage.removeItem(key),
  }),
  configurationId = 'configuration';
let configuration = cache.getItem(configurationId, 'object') || {};

if (Object.keys(configuration).length !== Object.keys(configurationStructure.itemContent).length) {
  Object.keys(configurationStructure.itemContent).forEach((key) => {
    if (configuration[key] === undefined) {
      configuration[key] = configurationStructure.itemContent[key].default;
    }
  });
  cache.setItem(configurationId, configuration);
}

const refreshIntervalSetOnStart = Boolean(process.argv.indexOf('-r') > -1 || process.argv.indexOf('--refresh-interval') > -1);
if (refreshIntervalSetOnStart === false) {
  refreshInterval = configuration.refreshInterval * 1000;
} else {
  refreshInterval = options.refreshInterval * 1000;
}

const timeOutToPreventBotFlood = 1000 * 15, // 30 seconds
  storeSession = new StoreSession('data/session'),
  lastProcessed = cache.getItem('lastProcessed') || {},
  lastForwarded = cache.getItem('lastForwarded') || {},
  lastForwardedDelayed = {},
  forwardRulesId = 'forwardRules',
  topicsCache = {};
let apiId = cache.getItem('apiId', 'number'),
  apiHash = cache.getItem('apiHash'),
  botAuthToken = cache.getItem('botAuthToken'),
  forwardRules = cache.getItem(forwardRulesId) || [],
  meUser = null,
  meBot = null,
  meUserId = -1,
  meBotId = -1,
  fromIds = [],
  fromIdsWithEdit = [],
  clientAsUser = null,
  clientAsBot = null,
  allowedUsers = [],
  clientDialogs = [],
  refreshIntervalId = null,
  resubscribeIntervalId = null,
  menuRoot = null;
const getItemLabel = (data) => data.label,
  fromToTypes = new Map([
    ['user', i18n.__('User')],
    ['bot', i18n.__('Bot')],
    ['group', i18n.__('Group')],
    ['channel', i18n.__('Channel')],
    ['topic', i18n.__('Topic')],
  ]),
  topicIdPresence = (item, path) => {
    const type = path.slice(0, -1).reduce((acc, key) => (acc[key] !== undefined ? acc[key] : null), item);
    return type?.type === 'topic' ? 'mandatory' : 'none';
  },
  getDialogId = (data, key) => {
    const item = data[key],
      result = new Map();
    if (item !== undefined) {
      const type = item.type;
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
            dialogs = clientDialogs.filter((dialog) => dialog.isGroup === true && dialog.isChannel !== true);
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
          clientAsUser
            .invoke(
              new Api.channels.GetForumTopics({
                channel: entity,
                limit: 100,
                offsetId: 0,
                offsetDate: 0,
                addOffset: 0,
              }),
            )
            .then((result) => {
              topicsCache[`${entity.id}`] = {topics: result.topics, timeStamp: Date.now()};
              resolve(result.topics);
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
  onEnabledChange = (_currentItem, _key, data, _path) => {
    let result = true;
    if (data.enabled === false) {
      result = data.processMissedMaxCount !== undefined && data.processMissedMaxCount !== null;
      if (result === true) {
        for (const key of ['from', 'to']) {
          const dialog = getDialogById(data[key].id);
          if (dialog !== null && dialog !== undefined) {
            switch (data[key].type) {
              case 'user': {
                result =
                  dialog.isGroup !== true &&
                  dialog.isChannel !== true &&
                  dialog.isUser === true &&
                  typeof data[key].topicId !== 'number' &&
                  dialog.entity?.bot === false;
                break;
              }
              case 'bot': {
                result =
                  dialog.isGroup !== true &&
                  dialog.isChannel !== true &&
                  dialog.isUser === true &&
                  typeof data[key].topicId !== 'number' &&
                  dialog.entity?.bot === true;
                break;
              }
              case 'group': {
                result =
                  dialog.isGroup === true && dialog.isChannel !== true && dialog.isUser !== true && typeof data[key].topicId !== 'number';
                break;
              }
              case 'channel': {
                result =
                  dialog.isGroup !== true && dialog.isChannel === true && dialog.isUser !== true && typeof data[key].topicId !== 'number';
                break;
              }
              case 'topic': {
                result = dialog.entity.forum === true && typeof data[key].topicId === 'number';
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
        text: 'Delay to prevent multiple forwards of the same message due to fast edits on source side',
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
            source: (data) => getDialogId(data, 'from'),
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
            source: (data) => getDialogId(data, 'to'),
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
              label: 'Keywords groups',
              text: 'Keywords groups array',
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
    menuColumnsMaxCount: configuration.menuColumnsMaxCount,
    textSummaryMaxLength: configuration.textSummaryMaxLength,
    spaceBetweenColumns: configuration.spaceBetweenColumns,
    buttonsMaxCount: configuration.buttonsMaxCount,
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
    const newFromIds = forwardRules.filter((rule) => rule.enabled).map((rule) => Number(rule.from.id)),
      newFromIdsWithEdit = forwardRules.filter((rule) => rule.enabled && rule.processEditsOnForwarded).map((rule) => Number(rule.from.id));
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

// eslint-disable-next-line sonarjs/sonar-max-params
function forwardMessage(rule, fromPeer, sourceId, toPeer, lastProcessedId, messageId, message, messageEditDate) {
  const forwardMessageInput = {
    fromPeer: fromPeer,
    id: [messageId],
    toPeer: toPeer,
    randomId: [getRandomId()],
    silent: false,
    background: false,
    withMyScore: false,
    grouped: false,
    fromLive: false,
    useQuickAck: false,
    scheduleDate: null,
  };
  if (rule.to.topicId !== null && rule.to.topicId !== undefined) {
    forwardMessageInput.topMsgId = rule.to.topicId;
  }
  clientAsUser
    .invoke(new Api.messages.ForwardMessages(forwardMessageInput))
    .then((res) => {
      if (rule.antiFastEditDelay > 0 && lastForwardedDelayed[rule.from.id] === undefined) {
        delete lastForwardedDelayed[rule.from.id];
      }
      log.info(`[${rule.label}, ${sourceId}, ${messageId}]: Message is forwarded successfully!`, logAsUser);
      if (messageId > lastProcessedId) {
        lastProcessed[rule.from.id] = {id: messageId, editDate: messageEditDate};
        cache.setItem('lastProcessed', lastProcessed);
      }
      lastForwarded[rule.from.id] = {id: messageId, editDate: messageEditDate, message: message};
      cache.setItem('lastForwarded', lastForwarded);
    })
    .catch((err) => {
      log.warn(`[${rule.label}, ${sourceId}, ${messageId}]: ${err}`, logAsUser);
    });
}

function onMessageToForward(event, onRefresh = false, onEdit = false) {
  const peerId = event.message?.peerId,
    sourceId = Number(peerId?.channelId || peerId?.userId || peerId?.chatId || 0),
    message = event.message.message || '',
    messageId = event.message.id,
    messageEditDate = event.message.editDate || 0,
    messageIsString = typeof event.message.message === 'string';
  log.debug(
    `[${sourceId}, ${messageId}]: Message in monitored channel/group via ${onRefresh ? 'refresh' : 'event'} ${
      onEdit ? 'onEdit' : 'onNew'
    }, message.date: ${event.message.date} (${printMessageDate(event.message.date)}), message.editDate: ${
      event.message.editDate
    } (${printMessageDate(messageEditDate)}), message: ${message}.`,
    logAsUser,
  );
  if (typeof peerId === 'object' && fromIds.includes(sourceId)) {
    const rule = forwardRules.find((rule) => rule.from.id === `${sourceId}`),
      entityFrom = rule ? getEntityById(rule.from.id) : null,
      entityTo = rule ? getEntityById(rule.to.id) : null;
    if (
      entityFrom !== null &&
      entityFrom !== undefined &&
      (rule.from.type !== 'topic' ||
        (entityFrom.forum === true &&
          (event.message?.replyToMsgId === rule.from.topicId || (rule.from.topicId === 1 && event.message?.replyToMsgId === undefined)))) &&
      entityTo !== null &&
      entityTo !== undefined
    ) {
      if (onEdit === false) {
        clientAsUser.markAsRead(entityFrom, event.message).catch((err) => {
          log.warn(`[${rule.label}, ${sourceId}, ${messageId}]: MarkAsRead error: ${stringify(err)}`, logAsUser);
        });
      }
      const lastForwardedId =
          (typeof lastForwarded[rule.from.id] === 'object' ? lastForwarded[rule.from.id].id : lastForwarded[rule.from.id]) || 0,
        lastForwardedEditDate = typeof lastForwarded[rule.from.id] === 'object' ? lastForwarded[rule.from.id].editDate : 0,
        lastForwardedMessage = typeof lastForwarded[rule.from.id] === 'object' ? lastForwarded[rule.from.id].message : '',
        lastProcessedId =
          (typeof lastProcessed[rule.from.id] === 'object' ? lastProcessed[rule.from.id].id : lastProcessed[rule.from.id]) || 0,
        lastProcessedEditDate = typeof lastProcessed[rule.from.id] === 'object' ? lastProcessed[rule.from.id].editDate : 0,
        lastForwardedDelayedId = lastForwardedDelayed[rule.from.id]?.id || 0,
        lastForwardedDelayedTimeout = lastForwardedDelayed[rule.from.id]?.timeout || null;
      let skipProcessing =
        onEdit === true && lastProcessedId !== messageId && lastForwardedId !== messageId && lastForwardedDelayedId !== messageId;
      let toForward = false;
      if (onEdit === true) {
        if (lastForwardedId === messageId && lastForwardedEditDate < messageEditDate) {
          if (message !== lastForwardedMessage) {
            toForward = true;
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
        if (lastForwardedDelayedId === messageId && lastForwardedDelayedTimeout !== null) {
          clearTimeout(lastForwardedDelayedTimeout);
          delete lastForwardedDelayed[rule.from.id];
          if (skipProcessing === false) {
            toForward = true;
            log.info(
              `[${rule.label}, ${sourceId}, ${messageId}]: Message is edited before anti fast edit delay! Previous version will not be forwarded!`,
              logAsUser,
            );
          }
        }
      }
      if (
        toForward === false &&
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
      } else if (
        toForward === false &&
        skipProcessing === false &&
        messageIsString &&
        Array.isArray(rule.keywordsGroups) &&
        rule.keywordsGroups.length > 0
      ) {
        toForward =
          toForward ||
          rule.keywordsGroups.some((keywordsGroup) => {
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
          lastForwardedDelayed[rule.from.id] = {
            id: messageId,
            timeout: setTimeout(() => {
              delete lastForwardedDelayed[rule.from.id];
              forwardMessage(rule, peerId, sourceId, entityTo, lastProcessedId, messageId, message, messageEditDate);
            }, rule.antiFastEditDelay * 1000),
          };
        } else {
          forwardMessage(rule, peerId, sourceId, entityTo, lastProcessedId, messageId, message, messageEditDate);
        }
      } else {
        log.debug(`[${rule.label}, ${sourceId}, ${messageId}]: Message is not forwarded! See reasons above.`, logAsUser);
        if (messageId > lastProcessedId || (messageId === lastProcessedId && messageEditDate > lastProcessedEditDate)) {
          lastProcessed[rule.from.id] = {id: messageId, editDate: messageEditDate || 0};
          cache.setItem('lastProcessed', lastProcessed);
        }
      }
    }
  }
}

function onCommand(event) {
  if (event instanceof CallbackQueryEvent) {
    const {userId, peer, msgId: messageId, data} = event.query;
    log.debug(`onCommand | CallBack | userId: ${userId}, messageId: ${messageId}, data: ${data}`, logAsBot);
    if (
      data !== undefined &&
      ((userId !== undefined && allowedUsers.includes(Number(userId))) ||
        (peer.userId !== undefined && allowedUsers.includes(Number(peer.userId))))
    ) {
      const command = data.toString();
      log.debug(`onCommand | command: ${command}`, logAsBot);
      if (command.startsWith(menuDefaults.cmdPrefix)) {
        menuRoot.onCommand(peer, peer.userId, messageId, command, true);
      }
    }
  } else if (event instanceof NewMessageEvent) {
    const {peerId, id: messageId, message: command} = event.message;
    log.debug(
      `onCommand | userId: ${peerId.userId}, isBot: ${event._client?._bot}, messageId: ${messageId}, command: ${command}`,
      logAsBot,
    );
    if (command !== undefined && peerId.userId !== undefined && allowedUsers.includes(Number(peerId.userId))) {
      menuRoot.onCommand(peerId, peerId.userId, messageId, command, false);
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
            cache.setItem('botStartTimeStamp', `${Date.now()}`);
            clientAsBot.getMe().then((user) => {
              meBot = user;
              meBotId = Number(meBot.id);
              updateCommandListeners(true);
              if (Array.isArray(clientDialogs) && clientDialogs.length > 0) {
                // eslint-disable-next-line sonarjs/no-nested-functions
                const items = clientDialogs.filter((dialog) => dialog.isUser && `${dialog.id}` === `${meBot.id}`);
                if (items.length === 0 && meUser !== null) {
                  log.info(`Chat with bot is not open!`, logAsBot);
                  clientAsUser
                    .getInputEntity(meBot.username)
                    // eslint-disable-next-line sonarjs/no-nested-functions
                    .then((botId) => {
                      log.debug(`Entity: ${stringify(botId)}`, logAsUser);
                      clientAsUser
                        .sendMessage(botId, {message: '/start'})
                        .then((msg) => {
                          log.debug(`Message to the chat with bot sent successfully!`, logAsUser);
                        })
                        .catch((err) => {
                          log.warn(`Can't send message to the bot! Error is ${stringify(err)}`, logAsUser);
                        });
                    })
                    // eslint-disable-next-line sonarjs/no-nested-functions
                    .catch((err) => {
                      log.warn(`Can't get bot entity! Error is ${stringify(err)}`, logAsBot);
                    });
                } else if (items.length > 0) {
                  log.debug(`Chat with bot is already started!`, logAsBot);
                }
              }
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

i18n.setLocale(configuration.language);
cache.registerEventForItem(forwardRulesId, Cache.eventSet, () => updateForwardListeners());

menuRoot = new MenuItemRoot(menuRootStructure);
menuRoot
  .init(
    {
      makeButton: (label, command) => Button.inline(label || '?', Buffer.from(command)),
      sendMessageAsync: async (peer, messageObject) => {
        if (clientAsBot !== null && clientAsBot.connected === true) {
          return await clientAsBot.sendMessage(peer, messageObject);
        }
        return null;
      },
      editMessageAsync: async (peer, messageObject) => {
        if (clientAsBot !== null && clientAsBot.connected === true) {
          return await clientAsBot.editMessage(peer, messageObject);
        }
        return null;
      },
      deleteMessageAsync: async (peer, menuMessageId) => {
        if (clientAsBot !== null && clientAsBot.connected === true) {
          return await clientAsBot.deleteMessages(peer, [menuMessageId], {revoke: true});
        }
        return null;
      },
    },
    options.debug ? 'debug' : 'info',
    log,
    i18n,
  )
  .then(() => {
    if (options.command !== undefined) {
      log.debug(`Testing command: ${options.command}`);
      menuRoot.onCommand(null, 0, 0, options.command);
    } else {
      getAPIAttributes().then(() => {
        if (apiId !== null && apiHash !== null) {
          clientAsUser = new TelegramClient(storeSession, apiId, apiHash, {
            connectionRetries: Infinity,
            autoReconnect: true,
            appVersion: scriptVersion,
          });
          clientAsUser.setParseMode('html');
          if (options.debugClientUser === true) clientAsUser.setLogLevel('debug');
          if (options.noBot !== true) {
            clientAsBot = new TelegramClient(new StringSession(''), apiId, apiHash, {
              connectionRetries: Infinity,
              autoReconnect: true,
              appVersion: scriptVersion,
            });
            clientAsBot.setParseMode('html');
            if (options.debugClientBot === true) clientAsBot.setLogLevel('debug');
          }
          const rl = readline.createInterface({
            input,
            output,
          });
          clientAsUser
            .start({
              phoneNumber: async () => await rl.question('Enter your phone number: '),
              password: async () => rl.question('Enter your password: '),
              phoneCode: async () => rl.question('Enter the code: '),
              onError: (err) => {
                log.warn(err, logAsUser);
              },
            })
            .then((connect) => {
              rl.close();
              clientAsUser
                .isUserAuthorized()
                .then((isAuthorized) => {
                  log.info(`User is authorized: ${isAuthorized}`, logAsUser);
                  // eslint-disable-next-line sonarjs/no-nested-functions
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
                  });
                })
                .catch((err) => {
                  log.warn(`User is not authorized! Error is ${stringify(err)}`, logAsUser);
                });
            })
            .catch((err) => {
              rl.close();
              log.warn(`User can't connect! Error is ${stringify(err)}`, logAsUser);
            });
        }
      });
    }
  })
  .catch((err) => {
    log.error(`Error on menuRoot.init(): ${stringify(err)}`);
  });

function getRandomId() {
  // eslint-disable-next-line sonarjs/pseudo-random
  return BigInt(`${Date.now()}${Math.floor(Math.random() * 1000)}`);
}

function printMessageDate(date) {
  return new Date(date * 1000).toString();
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
  if (apiId === null || apiHash === null || botAuthToken === null) {
    const rl = readline.createInterface({
      input,
      output,
    });
    if (apiId === null || apiHash === null) {
      const id = await rl.question('Enter your API ID: ');
      apiId = parseInt(id);
      cache.setItem('apiId', id);
      apiHash = await rl.question('Enter your API Hash: ');
      cache.setItem('apiHash', apiHash);
    }
    if (botAuthToken === null && options.noBot !== true) {
      botAuthToken = await rl.question('Enter your Bot Auth Token: ');
      cache.setItem('botAuthToken', botAuthToken);
    }
    rl.close();
  }
  return Promise.resolve();
}

function processClientExit(clients) {
  if (Array.isArray(clients) && clients.length > 0) {
    const client = clients.shift();
    if (client !== null && client.connected === true) {
      client.isBot().then((isBot) => {
        client.disconnect().then(() => {
          log.info(`Client is disconnected!`, isBot ? logAsBot : logAsUser);
          client.destroy().then(() => {
            log.info(`Client is destroyed!`, isBot ? logAsBot : logAsUser);
            if (clients.length > 0) {
              processClientExit(clients);
            } else {
              log.info('All clients are disconnected! Exiting ...');
              exit(0);
            }
          });
        });
      });
    } else {
      processClientExit(clients);
    }
  } else {
    log.info('All clients are disconnected!');
    exit(0);
  }
}

function gracefulExit() {
  processClientExit([clientAsBot, clientAsUser]);
}

async function refreshDialogs() {
  let result = false,
    error = '';
  if (clientAsUser !== null && clientAsUser.connected === true) {
    const dialogs = await clientAsUser.getDialogs();
    forwardRules = cache.getItem(forwardRulesId);
    if (Array.isArray(dialogs) && dialogs.length > 0) {
      clientDialogs = dialogs.filter((dialog) => dialog.entity?.migratedTo === undefined || dialog.entity?.migratedTo === null);
      const groupsOrChannels = dialogs.filter((dialog) => dialog.isChannel || dialog.isGroup),
        filteredRules = forwardRules.filter((rule) => rule.enabled);
      for (const rule of filteredRules) {
        let dialogFrom = null;
        for (const key of ['from', 'to']) {
          const item = groupsOrChannels.find((item) => rule[key].id === `${item.entity.id}`);
          if (key === 'from') {
            dialogFrom = item;
          }
          if (rule[key].topicId !== null && rule[key].topicId !== undefined) {
            if (item.entity?.forum === true) {
              const forum = await clientAsUser.invoke(
                new Api.channels.GetForumTopics({
                  channel: item.entity,
                  limit: 100,
                  offsetId: 0,
                  offsetDate: 0,
                  addOffset: 0,
                }),
              );
              if (Array.isArray(forum.topics) && forum.topics.length > 0) {
                if (forum.topics.find((topic) => topic.id === rule[key].topicId) === undefined) {
                  log.warn(`[${rule.label}]: Topic with id ${rule[key].topicId} not found in ${item.title}!`);
                  rule.enabled = false;
                }
              } else {
                log.warn(`[${rule.label}]: No topics found in ${item.title}!`);
                rule.enabled = false;
              }
            } else {
              log.warn(`[${rule.label}]: Topic with id ${rule[key].topicId} not found in ${item.title}!`);
              rule.enabled = false;
            }
          }
        }
        if (rule.enabled) {
          if (fromIds.includes(Number(rule.from.id)) === false) {
            fromIds.push(Number(rule.from.id));
          }
          if (fromIdsWithEdit.includes(Number(rule.from.id)) === false && rule.processEditsOnForwarded === true) {
            fromIdsWithEdit.push(Number(rule.from.id));
          }
          const lastProcessedId =
            (typeof lastProcessed[rule.from.id] === 'object' ? lastProcessed[rule.from.id].id : lastProcessed[rule.from.id]) || 0;
          const lastProcessedEditDate = lastProcessed[rule.from.id]?.editDate || 0;
          const lastSourceId = dialogFrom.dialog?.topMessage;
          if (rule.processMissedMaxCount > 0 && dialogFrom !== null && dialogFrom !== undefined) {
            if (rule.processEditsOnForwarded === true) {
              const lastForwardedId =
                  (typeof lastForwarded[rule.from.id] === 'object' ? lastForwarded[rule.from.id].id : lastForwarded[rule.from.id]) || 0,
                lastForwardedEditDate = lastForwarded[rule.from.id]?.editDate || 0;
              if (lastForwardedId !== 0) {
                const messages = await clientAsUser.getMessages(dialogFrom, {ids: lastForwardedId});
                if (Array.isArray(messages) && messages.length > 0) {
                  const message = messages[0],
                    messageDate = message.date || 0,
                    messageEditDate = message.editDate || 0;
                  if (typeof message === 'object' && message !== null) {
                    log.debug(
                      `[${rule.label}]: In "${dialogFrom.title}" last forwarded message - id: ${message.id}, message: ${
                        message.message
                      }, message.date: ${printMessageDate(messageDate)}, message.editDate: ${printMessageDate(
                        messageEditDate,
                      )}, lastForwardedEditDate: ${printMessageDate(lastForwardedEditDate)}`,
                      logAsUser,
                    );
                    if (messageEditDate > messageDate && messageEditDate > lastForwardedEditDate) {
                      log.debug(
                        `[${rule.label}]: In "${dialogFrom.title}" edited forwarded message - id: ${message.id}, message.date: ${messageDate}, message.editDate: ${messageEditDate}, lastProcessedEditDate: ${lastForwardedEditDate}, message: ${message.message}`,
                        logAsUser,
                      );
                      onMessageToForward({message}, true, true);
                    }
                  }
                }
              }
              if (lastProcessedId !== 0 && lastProcessedId !== lastForwardedId) {
                const messages = await clientAsUser.getMessages(dialogFrom, {ids: lastProcessedId});
                if (Array.isArray(messages) && messages.length > 0) {
                  const message = messages[0],
                    messageDate = message.date || 0,
                    messageEditDate = message.editDate || 0;
                  if (typeof message === 'object' && message !== null) {
                    log.debug(
                      `[${rule.label}]: In "${dialogFrom.title}" last processed message - id: ${message.id}, message: ${
                        message.message
                      }, message.date: ${printMessageDate(messageDate)}, message.editDate: ${printMessageDate(
                        messageEditDate,
                      )}, lastProcessedEditDate: ${printMessageDate(lastProcessedEditDate)}`,
                      logAsUser,
                    );
                    if (messageEditDate > messageDate && messageEditDate > lastProcessedEditDate) {
                      log.debug(
                        `[${rule.label}]: In "${dialogFrom.title}" edited last processed message - id: ${message.id}, message.date: ${messageDate}, message.editDate: ${messageEditDate}, lastProcessedEditDate: ${lastProcessedEditDate}, message: ${message.message}`,
                        logAsUser,
                      );
                      onMessageToForward({message}, true, true);
                    }
                  }
                }
              }
            }
            if (lastProcessedId !== 0 && lastSourceId !== 0 && lastProcessedId < lastSourceId) {
              log.debug(
                `[${rule.label}]: In "${dialogFrom.title}" the last processed message id: ${lastProcessedId}, ` +
                  `last source message id: ${lastSourceId}`,
                logAsUser,
              );
              const messageCount =
                  lastSourceId - lastProcessedId > rule.processMissedMaxCount ? rule.processMissedMaxCount : lastSourceId - lastProcessedId,
                messageIds = new Array(messageCount).fill(0).map((_, index) => lastSourceId - messageCount + index + 1),
                messages = await clientAsUser.getMessages(dialogFrom, {
                  ids: messageIds,
                });
              if (Array.isArray(messages) && messages.length > 0) {
                messages.forEach((message, index) => {
                  if (message !== undefined) {
                    log.debug(`[${rule.label}]: Missed message - id: ${message.id}, message: ${message.message}`, logAsUser);
                    onMessageToForward({message}, true);
                  } else {
                    log.debug(`[${rule.label}]: Missed message [${index}] is undefined!`, logAsUser);
                  }
                });
              }
            } else if (lastProcessedId === undefined && lastSourceId !== undefined) {
              lastProcessed[rule.from.id] = lastSourceId;
              cache.setItem('lastProcessed', lastProcessed);
            }
          } else if (
            rule.enabled &&
            dialogFrom !== null &&
            dialogFrom !== undefined &&
            lastSourceId !== undefined &&
            lastSourceId > lastProcessedId
          ) {
            lastProcessed[rule.from.id] = lastSourceId;
            cache.setItem('lastProcessed', lastProcessed);
          }
        }
      }
      cache.setItem(forwardRulesId, forwardRules);
      log.debug(
        `Dialogs refreshed! Dialogs: ${dialogs.length}, filteredRules: ${filteredRules.length}, IdsToMonitor: ${stringify(
          forwardRules.filter((rule) => rule.enabled).map((rule) => Number(rule.from.id)),
        )}`,
        logAsUser,
      );
      result = true;
    } else {
      error = `Can't get dialogs!`;
      clientDialogs = [];
      log.warn(`No dialogs found!`, logAsUser);
    }
  }
  return new Promise((resolve, reject) => {
    if (result) {
      resolve(true);
    } else {
      clientDialogs = [];
      reject(new Error(error));
    }
  });
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
