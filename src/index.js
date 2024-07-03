const {Api, TelegramClient} = require('telegram');
const {StringSession, StoreSession} = require('telegram/sessions');
const readline = require('node:readline/promises');
const {stdin: input, stdout: output, exit} = require('node:process');
const stringify = require('json-stringify-safe');
const {LocalStorage} = require('node-localstorage');
const {MenuItem, MenuItemRoot} = require('./modules/menu/MenuItem');
const {MenuItemStructured} = require('./modules/menu/MenuItemStructured');
const {Cache} = require('./modules/cache/Cache');
const yargs = require('yargs');
const {setTimeout} = require('node:timers');
const {logLevelInfo, logLevelDebug, setLogLevel, logDebug, logInfo, logWarning, logError} = require('./modules/logging/logging');
const {NewMessage, NewMessageEvent} = require('telegram/events');
const {CallbackQuery, CallbackQueryEvent} = require('telegram/events/CallbackQuery');
const {name: scriptName, version: scriptVersion} = require('./version');
const i18n = require('./modules/i18n/i18n.config');

const options = yargs
  .usage('Usage: $0 [options]')
  .option('r', {
    alias: 'refresh-interval',
    describe: 'Refresh information from Telegram servers, in seconds',
    type: 'number',
    default: 300,
    demandOption: false,
  })
  .option('m', {
    alias: 'process-missed',
    describe: 'Process missed messages, max count is 10 messages per channel/group',
    type: 'number',
    default: 0,
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

setLogLevel(options.debug ? logLevelDebug : logLevelInfo);

logInfo(`${scriptName} v${scriptVersion} started!`);
logInfo(`Refresh interval: ${options.refreshInterval} seconds!`);
logInfo(`Process missed messages: ${options.processMissed ? 'not more than ' + options.processMissed : 'disabled'}.`);
if (options.noBot === true) logInfo('Starting without bot instance!');
if (options.debug === true) logInfo('Verbose logging is enabled!');
if (options.command !== undefined) logInfo(`Command to test: ${options.command}`);

const refreshInterval = options.refreshInterval * 1000,
  timeOutToPreventBotFlood = 1000 * 15, // 30 seconds
  storage = new LocalStorage('data/storage'),
  storeSession = new StoreSession('data/session'),
  cache = new Cache({
    getItem: (key) => storage.getItem(key),
    setItem: (key, value) => storage.setItem(key, value),
    removeItem: (key) => storage.removeItem(key),
  }),
  allowedUsers = cache.getItem('allowedUsers') || [],
  lastProcessed = cache.getItem('lastProcessed') || {},
  configurationId = 'configuration',
  forwardRulesId = 'forwardRules';
let apiId = cache.getItem('apiId', 'number'),
  apiHash = cache.getItem('apiHash'),
  botAuthToken = cache.getItem('botAuthToken'),
  forwardRules = cache.getItem(forwardRulesId) || [],
  configuration = cache.getItem(configurationId, 'object') || {},
  meUser = null,
  meBot = null,
  meUserId = -1,
  meBotId = -1,
  fromIds = [],
  clientAsUser = null,
  clientAsBot = null,
  clientDialogs = [],
  refreshIntervalId = null,
  eventHandlerForwards = null,
  menuRoot = null;
const getLanguages = () => {
    return new Map(i18n.getLocales().map((locale) => [locale, locale]));
  },
  onLanguageChange = (currentItem, key, data, path) => {
    i18n.setLocale(data.language);
    return true;
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
        label: 'Process missed messages',
        text: 'Process missed messages, max count is 100 messages per channel/group',
      },
      menuColumnsMaxCount: {
        type: 'number',
        subType: 'integer',
        options: {
          min: 0,
          max: 10,
          step: 1,
        },
        sourceType: 'input',
        presence: 'mandatory',
        editable: true,
        onSetAfter: onMenuColumnsMaxCountChange,
        default: MenuItem.menuColumnsMaxCountDefault,
        label: 'Max columns in row',
        text: 'Max count of columns in one row of the menu',
      },
      textSummaryMaxLength: {
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
        onSetAfter: onTextSummaryMaxLengthChange,
        default: MenuItem.textSummaryMaxLengthDefault,
        label: 'Text summary max length',
        text: 'Approximated max length of the text in one row of the menu',
      },
      spaceBetweenColumns: {
        type: 'number',
        subType: 'integer',
        options: {
          min: 1,
          max: 5,
          step: 1,
        },
        sourceType: 'input',
        presence: 'mandatory',
        editable: true,
        onSetAfter: onSpaceBetweenColumnsChange,
        default: MenuItem.spaceBetweenColumnsDefault,
        label: 'Space between columns',
        text: 'Space between columns in the menu',
      },
      buttonsMaxCount: {
        type: 'number',
        subType: 'integer',
        options: {
          min: 10,
          max: 50,
          step: 1,
        },
        sourceType: 'input',
        presence: 'mandatory',
        editable: true,
        onSetAfter: onButtonMaxCountChange,
        default: MenuItem.buttonsMaxCountDefault,
        label: 'Max buttons on "page"',
        text: 'Max count of buttons on the one "page" of the menu',
      },
    },
  },
  getItemLabel = (data) => data.label,
  fromToTypes = new Map([
    ['channel', i18n.__('Channel')],
    ['group', i18n.__('Group')],
    ['chat', i18n.__('Chat')],
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
          case 'channel': {
            dialogs = clientDialogs.filter((dialog) => dialog.isChannel && !dialog.isGroup);
            break;
          }
          case 'group': {
            dialogs = clientDialogs.filter((dialog) => dialog.isGroup && !dialog.isChannel);
            break;
          }
          case 'chat': {
            dialogs = clientDialogs.filter((dialog) => dialog.isUser);
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
          .then((res) => {
            resolve(res.topics);
          })
          .catch((err) => {
            logWarning(err, false);
            resolve([]);
          });
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
        logWarning(`No topics can be found for ${item.title}!`);
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
          const entity = getEntityById(data[key].id);
          if (entity !== null && entity !== undefined) {
            switch (data[key].type) {
              case 'channel': {
                result = entity.isChannel && !entity.isGroup && typeof data[key].topicId !== 'number';
                break;
              }
              case 'group': {
                result = entity.isGroup && !entity.isChannel && typeof data[key].topicId !== 'number';
                break;
              }
              case 'chat': {
                result = entity.isUser && typeof data[key].topicId !== 'number';
                break;
              }
              case 'topic': {
                result = entity.forum === true && typeof data[key].topicId === 'number';
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
    primaryId: 'label',
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
        default: configuration.processMissedMaxCount || 0,
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
      message: {
        type: 'object',
        presence: 'mandatory',
        editable: true,
        itemContent: {
          includes: {
            type: 'array',
            presence: 'mandatory',
            editable: true,
            default: [],
            label: 'Keywords to include',
            text: 'Keywords to be included in the message, at least one is mandatory',
            structure: {
              primaryId: 'value',
              plain: true,
              itemContent: {
                value: {
                  type: 'string',
                  presence: 'mandatory',
                  editable: true,
                  sourceType: 'input',
                  label: 'Keyword to include',
                  text: 'Keyword to be included in the message, at least one is mandatory',
                },
              },
            },
          },
          excludes: {
            type: 'array',
            presence: 'mandatory',
            editable: true,
            default: [],
            label: 'Keywords to exclude',
            text: 'Keywords to be not included in the message',
            structure: {
              primaryId: 'value',
              plain: true,
              itemContent: {
                value: {
                  type: 'string',
                  presence: 'mandatory',
                  editable: true,
                  sourceType: 'input',
                  label: 'Keyword to exclude',
                  text: 'Keyword to be not included in the message',
                },
              },
            },
          },
        },
      },
    },
  };


async function initMenu() {
  const menuConfiguration = new MenuItemStructured(
      i18n.__('Configuration'),
      '/configuration',
      configurationId,
      configurationStructure,
      false,
      -1,
      () => (configuration = cache.getItem(configurationId, 'object')),
    ),
    menuForwardRules = new MenuItemStructured(
      i18n.__('Forward Rules'),
      '/forwardRules',
      forwardRulesId,
      forwardRuleStructure,
      true,
      -1,
      refreshDialogsOnce,
    );
  menuRoot = new MenuItemRoot(
    i18n.__('Menu'),
    '/start',
    i18n.__('Menu'),
    (key, type) => cache.getItem(key, type),
    (key, value) => cache.setItem(key, value),
    (key) => cache.removeItem(key),
    configuration.menuColumnsMaxCount,
    configuration.textSummaryMaxLength,
    configuration.spaceBetweenColumns,
    configuration.buttonsMaxCount,
  );
  await menuRoot.appendNested(menuConfiguration);
  await menuRoot.appendNested(menuForwardRules);
  return Promise.resolve(menuRoot);
}

function updateForwardListener() {
  if (clientAsUser !== null && clientAsUser.connected === true) {
    if (eventHandlerForwards !== null) {
      clientAsUser.removeEventHandler(onMessageToForward, eventHandlerForwards);
    }
    fromIds = forwardRules.filter((rule) => rule.enabled).map((rule) => Number(rule.from.id));
    eventHandlerForwards = new NewMessage({chats: fromIds});
    logInfo(`Starting listen on events in : ${stringify(fromIds)}`, false);
    clientAsUser.addEventHandler(onMessageToForward, eventHandlerForwards);
  } else {
    fromIds = forwardRules.filter((rule) => rule.enabled).map((rule) => rule.from.id);
    logDebug(`Id's to listen : ${stringify(fromIds)}`, false);
  }
}

function onMessageToForward(event) {
  const peerId = event.message?.peerId;
  logDebug(`Message in monitored channel/group - peerId: ${stringify(peerId)}`, false);
  logDebug(`type of peerId === 'object': ${typeof peerId === 'object'}`, false);
  logDebug(`Number(peerId.channelId): ${Number(peerId.channelId)}`, false);
  logDebug(`fromIds.includes(Number(peerId.channelId)): ${fromIds.includes(Number(peerId.channelId))}`, false);
  if (typeof peerId === 'object' && fromIds.includes(Number(peerId.channelId))) {
    const rule = forwardRules.find((rule) => rule.from.id === `${peerId.channelId}`),
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
      clientAsUser.markAsRead(entityFrom, event.message).catch((err) => {
        logWarning(`MarkAsRead error: ${stringify(err)}`, false);
      });
      let toForward = true;
      if (typeof rule.message === 'object' && Array.isArray(rule.message.includes) && rule.message.includes.length > 0) {
        toForward = rule.message.includes.find((item) => event.message.message.includes(item)) !== undefined;
      }
      if (toForward) {
        const forwardMessageInput = {
          fromPeer: peerId,
          id: [event.message.id],
          toPeer: entityTo,
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
            logDebug(`Message is forwarded successfully!`, false);
            lastProcessed[rule.from.id] = event.message.id;
            cache.setItem('lastProcessed', lastProcessed);
          })
          .catch((err) => {
            logWarning(err, false);
          });
      } else {
        logDebug(`Message is not forwarded! Message doesn't include any of the keywords!`, false);
        lastProcessed[rule.from.id] = event.message.id;
        cache.setItem('lastProcessed', lastProcessed);
      }
    }
  }
}

function onCommand(event) {
  if (event instanceof CallbackQueryEvent) {
    const {userId, peer: peerId, msgId: messageId, data} = event.query;
    logDebug(`onCommand | userId: ${userId}, peerId: ${stringify(peerId)}, messageId: ${messageId}, data: ${data}`, true);
    if (
      data !== undefined &&
      ((userId !== undefined && allowedUsers.includes(Number(userId))) ||
        (peerId.userId !== undefined && allowedUsers.includes(Number(peerId.userId))))
    ) {
      const command = data.toString();
      logDebug(`onCommand | command: ${command}`, true);
      if (command.startsWith(MenuItem.CmdPrefix)) {
        logDebug(`onCommand | userId: ${userId}, peerId: ${peerId}, messageId: ${messageId},` + ` command: ${command}`, true);
        menuRoot.onCommand(clientAsBot, peerId, messageId, command, true, true);
      }
    }
  } else if (event instanceof NewMessageEvent) {
    const {peerId, id: messageId, message: command} = event.message;
    logDebug(`onCommand | peerId: ${stringify(peerId)}, messageId: ${messageId}, command: ${command}`, false);
    if (command !== undefined && peerId.userId !== undefined && allowedUsers.includes(Number(peerId.userId))) {
      logDebug(`onCommand | peerId: ${stringify(peerId)}, messageId: ${messageId}, command: ${command}`, false);
      if (`${event.chatId}` === `${meUserId}`) {
        if (command.startsWith(MenuItem.CmdPrefix)) {
          menuRoot.onCommand(clientAsUser, peerId, messageId, command, false, false);
        }
      } else {
        menuRoot.onCommand(clientAsBot, peerId, messageId, command, false, true);
      }
    }
  } else {
    logWarning(`onCommand | Unknown event!`, false);
    Object.keys(event).forEach((key) => {
      logDebug(`Key: ${key}, value: ${stringify(event[key])}`, false);
    });
  }
}

function startBotClient() {
  if (options.noBot !== true && botAuthToken !== null) {
    clientAsBot
      .start({
        botAuthToken: botAuthToken,
        onError: (err) => {
          logWarning(err, true);
        },
      })
      .then(() => {
        clientAsBot
          .isUserAuthorized()
          .then((isAuthorized) => {
            logInfo(`Is authorized: ${isAuthorized}`, true);
            cache.setItem('botStartTimeStamp', `${Date.now()}`);
            clientAsBot.getMe().then((user) => {
              meBot = user;
              meBotId = Number(meBot.id);
              logInfo(`Starting listen on commands from : ${stringify(allowedUsers)}`, true);
              clientAsBot.addEventHandler(onCommand, new CallbackQuery({chats: allowedUsers}));
              clientAsBot.addEventHandler(onCommand, new NewMessage({chats: allowedUsers}));
              if (Array.isArray(clientDialogs) && clientDialogs.length > 0) {
                const items = clientDialogs.filter((dialog) => dialog.isUser && `${dialog.id}` === `${meBot.id}`);
                items.forEach((item) => {
                  logDebug(`Dialog: ${item.title}, id: ${item.id}`, true);
                  Object.keys(item)
                    .filter((key) => key.startsWith('is'))
                    .forEach((key) => {
                      logDebug(`  ${key}: ${item[key]}`, true);
                    });
                });
                if (items.length === 0 && meUser !== null) {
                  logInfo(`Chat with bot is not open!`, true);
                  clientAsUser
                    .getInputEntity(meBot.username)
                    .then((botId) => {
                      logDebug(`Entity: ${stringify(botId)}`, false);
                      clientAsUser
                        .sendMessage(botId, {message: '/start'})
                        .then((msg) => {
                          logDebug(`Message to chat with bot sent successfully!`, false);
                        })
                        .catch((err) => {
                          logWarning(`Can't send message to bot! Error is ${stringify(err)}`, false);
                        });
                    })
                    .catch((err) => {
                      logWarning(`Can't get bot entity! Error is ${stringify(err)}`, true);
                    });
                } else if (items.length > 0) {
                  logDebug(`Chat with bot is already started!`, true);
                }
              }
            });
          })
          .catch((err) => {
            logWarning(`Bot is not authorized! Error is ${stringify(err)}`, true);
          });
      })
      .catch((err) => {
        logWarning(`Bot can't connect! Error is ${stringify(err)}`, true);
        if (typeof err.seconds === 'number') {
          logWarning(`Bot will try to connect in ${err.seconds} seconds!`, true);
          setTimeout(() => {
            startBotClient();
          }, err.seconds * 1000);
        }
      });
  }
}

process.on('SIGINT', gracefulExit);
process.on('SIGTERM', gracefulExit);
if (Object.keys(configuration).length !== Object.keys(configurationStructure.itemContent).length) {
  Object.keys(configurationStructure.itemContent).forEach((key) => {
    if (configuration[key] === undefined) {
      configuration[key] = configurationStructure.itemContent[key].default;
    }
  });
  cache.setItem(configurationId, configuration);
}
i18n.setLocale(configuration.language);
cache.registerEventForItem(forwardRulesId, Cache.eventSet, updateForwardListener);
initMenu().then((menu) => {
  menuRoot = menu;
  if (options.command !== undefined) {
    logDebug(`Testing command: ${options.command}`);
    menuRoot.onCommand(null, null, null, options.command, options.noBot !== true);
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
              logWarning(err, false);
            },
          })
          .then((connect) => {
            rl.close();
            clientAsUser
              .isUserAuthorized()
              .then((isAuthorized) => {
                logInfo(`User is authorized: ${isAuthorized}`, false);
                clientAsUser.getMe().then((user) => {
                  meUser = user;
                  if (meUser !== null) {
                    meUserId = Number(meUser.id);
                    if (allowedUsers.indexOf(meUserId) === -1) {
                      allowedUsers.push(meUserId);
                    }
                  }
                  logDebug(`Allowed users: ${stringify(allowedUsers)}`, true);
                  refreshDialogs().then(() => {
                    if (Array.isArray(clientDialogs) && clientDialogs.length > 0) {
                      const items = clientDialogs.filter(
                        (dialog) =>
                          (dialog.isChannel || dialog.isGroup) &&
                          (dialog.entity?.migratedTo === undefined || dialog.entity?.migratedTo === null),
                      );
                      items.forEach((item) => {
                        if (item.entity?.forum === true) {
                          clientAsUser
                            .invoke(
                              new Api.channels.GetForumTopics({
                                channel: item.entity,
                                limit: 100,
                                offsetId: 0,
                                offsetDate: 0,
                                addOffset: 0,
                              }),
                            )
                            .then((res) => {
                              logDebug(`${item.isChannel ? 'Channel' : 'Group'}: ${item.title}, id: ${item.entity.id}`, false);
                              if (Array.isArray(res.topics) && res.topics.length > 0) {
                                res.topics.forEach((topic) => {
                                  logDebug(`  Topic: title: ${topic.title}, id: ${topic.id}`, false);
                                });
                              }
                            })
                            .catch((err) => {
                              logWarning(err, false);
                            });
                        } else {
                          logDebug(`${item.isChannel ? 'Channel' : 'Group'}: ${item.title}, id: ${item.entity.id}`, false);
                        }
                      });
                    }
                    logInfo(`Starting listen on commands from : ${stringify([meUserId])}`, false);
                    clientAsUser.addEventHandler(onCommand, new NewMessage({chats: [meUserId]}));
                    refreshDialogsStart();
                    const lastBotStartTimeStamp = cache.getItem('botStartTimeStamp', 'number');
                    let timeOut = typeof lastBotStartTimeStamp === 'number' ? Date.now() - lastBotStartTimeStamp : 0;
                    logDebug(
                      `Bot flood prevention timeout: ${timeOut} ms, lastBotStartTimeStamp: ${lastBotStartTimeStamp},` +
                        ` now: ${Date.now()}`,
                      false,
                    );
                    if (timeOut >= timeOutToPreventBotFlood) {
                      timeOut = 0;
                    } else if (timeOut > 0) {
                      timeOut = timeOutToPreventBotFlood - timeOut;
                    }
                    if (timeOut > 0) {
                      logDebug(`Bot flood prevention timeout: ${timeOut} ms`);
                      setTimeout(() => {
                        startBotClient();
                      }, timeOut);
                    } else {
                      startBotClient();
                    }
                  });
                });
              })
              .catch((err) => {
                logWarning(`User is not authorized! Error is ${stringify(err)}`, false);
              });
          })
          .catch((err) => {
            rl.close();
            logWarning(`User can't connect! Error is ${stringify(err)}`, false);
          });
      }
    });
  }
});

function getRandomId() {
  return BigInt(`${Date.now()}${Math.floor(Math.random() * 1000)}`);
}

function getEntityById(id) {
  let result = null;
  if (typeof id === 'string' && Array.isArray(clientDialogs) && clientDialogs.length > 0) {
    const dialog = clientDialogs.find((dialog) => id === `${dialog.entity.id}`);
    if (dialog !== undefined) {
      result = dialog.entity;
    }
  }
  return result;
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
          logInfo(`Client is disconnected!`, isBot);
          client.destroy().then(() => {
            logInfo(`Client is destroyed!`, isBot);
            if (clients.length > 0) {
              processClientExit(clients);
            } else {
              logInfo('All clients are disconnected! Exiting ...');
              exit(0);
            }
          });
        });
      });
    } else {
      processClientExit(clients);
    }
  } else {
    logInfo('All clients are disconnected!');
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
                  logWarning(`Topic with id ${rule[key].topicId} not found in ${item.title}!`);
                  rule.enabled = false;
                }
              } else {
                logWarning(`No topics found in ${item.title}!`);
                rule.enabled = false;
              }
            } else {
              logWarning(`Topic with id ${rule[key].topicId} not found in ${item.title}!`);
              rule.enabled = false;
            }
          }
        }
        let maxCountOfMissed = options.processMissed || configuration.processMissedMaxCount;
        if (rule.enabled && maxCountOfMissed > 0 && dialogFrom !== null && dialogFrom !== undefined) {
          const lastId = lastProcessed[rule.from.id],
            lastSourceId = dialogFrom.dialog?.topMessage;
          if (lastId !== undefined && lastSourceId !== undefined && lastId < lastSourceId) {
            logDebug(
              `In "${dialogFrom.title}" the last processed message id: ${lastId}, ` + `last source message id: ${lastSourceId}`,
              false,
            );
            const messageCount = lastSourceId - lastId > maxCountOfMissed ? maxCountOfMissed : lastSourceId - lastId,
              messageIds = new Array(messageCount).fill(0).map((_, index) => lastSourceId - messageCount + index + 1),
              messages = await clientAsUser.getMessages(rule.from.entity, {
                ids: messageIds,
              });
            if (Array.isArray(messages) && messages.length > 0) {
              messages.forEach((message) => {
                logDebug(`Missed message - id: ${message.id}, message: ${message.message}`, false);
                onMessageToForward({message});
              });
            }
          } else if (lastId === undefined && lastSourceId !== undefined) {
            lastProcessed[rule.from.id] = lastSourceId;
            cache.setItem('lastProcessed', lastProcessed);
          }
        }
      }
      cache.setItem(forwardRulesId, forwardRules);
      logDebug(
        `Dialogs refreshed! Dialogs: ${dialogs.length}, filteredRules: ${filteredRules.length}, fromIds: ${stringify(fromIds)}`,
        false,
      );
      result = true;
    } else {
      error = `Can't get dialogs!`;
      clientDialogs = [];
      logWarning(`No dialogs found!`, false);
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
    logWarning(`refreshDialogs error: ${stringify(err)}`, false);
  });
}

function refreshDialogsStart() {
  if (refreshIntervalId !== undefined && refreshIntervalId !== null) clearInterval(refreshIntervalId);
  refreshIntervalId = setInterval(refreshDialogsOnce, refreshInterval);
}



