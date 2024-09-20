/* eslint-disable sonarjs/public-static-readonly */
/** @module menu/menu-item  **/

const stringify = require('json-stringify-safe');
const emojiRegex = require('emoji-regex');
const i18n = require('../i18n/i18n.config');

const menuDefaults = {
  columnsMaxCount: 0,
  buttonsMaxCount: 24,
  textSummaryMaxLength: 0,
  spaceBetweenColumns: 1,
  cmdPrefix: '/',
};

let makeButton = (label, command) => `Button: ${label} - ${command}`;

function setFunctionMakeButton(func) {
  if (typeof func === 'function') {
    makeButton = func;
  }
}

/**
 * Class representing menu item
 * @class
 * @classdesc Class to represent menu item
 * @property {string|function} #label - Private label of the menu item
 * @property {string|function} #command - Private command of the menu item
 * @property {string|function} #text - Private text of the menu item
 * @property {boolean} isRoot - Check if the menu item is root
 * @property {function} onRun - Function to run on command
 * @property {string} group - Group of the menu item
 * @property {number} maxColumns - Maximum columns of the menu item
 * @property {MenuItem} holder - Holder of the menu item
 * @property {Array<MenuItem>} nested - Nested items of the menu item
 * @property {Array<string>} commands - Commands of the menu item
 * @property {string} CmdPrefix - Command prefix
 * @property {string} CmdExit - Exit command
 * @property {string} MenuMessageId - Menu message Id
 * @property {function} label - Get label of the menu item as string
 * @property {function} labelShort - Get short label of the menu item as string
 * @property {function} command - Get command of the menu item as string
 * @property {function} text - Get text of the menu item as string
 * @property {function} setHolder - Set holder of the menu item
 * @property {function} appendNested - Append nested item to the menu item
 * @property {function} postAppend - Post append operation
 * @property {function} getValue - Get value from storage
 * @property {function} setValue - Set value to storage
 * @property {function} removeValue - Remove value from storage
 * @property {function} getRoot - Get root of the menu item
 * @property {function} nestedCount - Get count of nested items
 * @property {function} isNestedExists - Check if nested items exists
 * @property {function} getByCommand - Get item by command from the menu items hierarchy
 * @property {function} createButton - Create button
 * @property {function} getButtons - Get buttons of the menu item build from the nested items
 * @property {function} refresh - Refresh menu item
 * @property {function} draw - Draw menu item
 * @property {function} onCommand - Handle command
 **/
class MenuItem {
  static cmdExit = `${menuDefaults.cmdPrefix}exit`;

  static buttonsOffsetRegex = new RegExp(`^${menuDefaults.cmdPrefix}.+?\\$bo=(?<offset>\\d+)$`);

  static MenuMessageId = 'menuMessageId';

  /**
   * This method trying to calculate "real" length, taking in account the Emoji's specifics.
   * @param {string} string - The source string.
   * @returns {number} The calculated string length.
   */
  static getStringLength(string) {
    let count = 0;
    if (typeof string === 'string' && string) {
      count = string.length;
      for (const match of string.matchAll(emojiRegex)) {
        const emoji = match[0];
        count += 2 - emoji.length;
      }
    }
    return count;
  }

  /**
   * Get key for the value
   * @param {string} key - Key to get item
   * @param {string=} chatId - Chat Id
   * @returns {string} - Key for the value
   **/
  static getValueKey(key, chatId = null) {
    return chatId ? `${key}.${chatId}` : key;
  }

  #label = '';
  #command = '';
  #text = '';

  #getValue = (key, type) => null;
  #setValue = (key, value) => {};
  #removeValue = (key) => {};

  isRoot = false;
  onRun;
  group = '';
  processInputForCommand = '';
  holder = null;
  logger = null;
  nested = new Array();
  commands = {};

  columnsMaxCount = menuDefaults.columnsMaxCount;
  textSummaryMaxLength = menuDefaults.textSummaryMaxLength;
  spaceBetweenColumns = menuDefaults.spaceBetweenColumns;
  buttonsMaxCount = menuDefaults.buttonsMaxCount;

  /**
   * @param {string|function} label - Label of the menu item
   * @param {string|function} command - Command of the menu item
   * @param {string|function} text - Text of the menu item
   * @param {function=} onRun - Function to run on command
   * @param {string=} group - Group of the menu item
   * @param {number=} maxColumns - Maximum columns of the menu item
   **/
  constructor(label, command, text, onRun = null, group = '') {
    this.#label = label;
    this.#command = command;
    this.#text = text;
    this.onRun = onRun;
    this.group = group;
  }

  /**
   * Get label of the menu item
   * @returns {string} - Label of the menu item
   **/
  get label() {
    if (typeof this.#label === 'function') {
      return this.#label();
    } else {
      return this.#label;
    }
  }

  /**
   * Get short label of the menu item
   * @returns {string} - Short label of the menu item
   **/
  // eslint-disable-next-line sonarjs/no-identical-functions
  get labelShort() {
    if (typeof this.#label === 'function') {
      return this.#label();
    } else {
      return this.#label;
    }
  }

  /**
   * Get command of the menu item
   **/
  get command() {
    if (typeof this.#command === 'function') {
      return this.#command();
    } else {
      return this.#command;
    }
  }

  /**
   * Get text of the menu item
   * @returns {string} - Text of the menu item
   **/
  get text() {
    if (typeof this.#text === 'function') {
      return this.#text();
    } else {
      return this.#text;
    }
  }

  /**
   * Set holder of the menu item
   * @param {MenuItem} holder - Holder of the menu item
   **/
  setHolder(holder) {
    this.holder = holder;
  }

  getCurrentMethodName() {
    const error = new Error();
    const stack = error.stack.split('\n');
    if (stack.length < 4) {
      return '';
    }
    const methodNames = stack[3].trim().split(' ');
    if (methodNames.length < 3) {
      return '';
    }
    if (methodNames[1].startsWith(`${this.constructor.name}.`) && methodNames[2].includes('(')) {
      return methodNames[1].split('.')[1];
    } else if (
      (methodNames[1] === 'get' || methodNames[1] === 'set') &&
      !methodNames[2].includes('(') &&
      methodNames.length > 3 &&
      methodNames[3].includes('(')
    ) {
      return methodNames.slice(1, 3).join('.');
    } else {
      return '';
    }
  }

  log(level = 'info', ...message) {
    if (typeof this.logger === 'object' && typeof this.logger[level] === 'function') {
      if (message.length < 2 || typeof message[0] !== 'string' || !message[0].startsWith(`${this.constructor.name}`)) {
        message.unshift(`${this.constructor.name}.${this.getCurrentMethodName()}{'${this.command}'}| `);
      }
      this.logger[level](message.join(''));
    }
  }

  /**
   * Append nested item to the menu item
   * @param {MenuItem} item - Nested item to append
   * @param {number=} index - Index to append
   **/
  async appendNested(item, index = -1) {
    let result = -1;
    const root = this.getRoot(),
      command = item.command;
    this.log('debug', `command: ${command}, commands: ${stringify(Object.keys(root.commands))}`);
    root?.updateCommands();
    if (command !== null && Object.keys(root?.commands).includes(command) === false) {
      if (index === -1 || index >= this.nested.length) {
        this.nested.push(item);
        result = this.nested.length - 1;
      } else {
        this.nested.splice(index, 0, item);
        result = index;
      }
      item.setHolder(this);
      await item.postAppend();
    } else {
      this.log('warn', `Command '${command}' is already exists! Item can't be added to the menu!`);
    }
    return result;
  }


  /**
   * Post append operation
   **/
  async postAppend() {
    if (this.holder?.logger) {
      this.logger = this.holder.logger;
      this.nested.forEach((item) => {
        item.logger = this.logger;
      });
    }
    this.updateCommands();
  }

  config(configuration) {
    if (this.isRoot && configuration) {
      if (typeof configuration.getValue === 'function') {
        this.#getValue = configuration.getValue;
      }
      if (typeof configuration.setValue === 'function') {
        this.#setValue = configuration.setValue;
      }
      if (typeof configuration.removeValue === 'function') {
        this.#removeValue = configuration.removeValue;
      }
      if (typeof configuration.columnsMaxCount === 'number') {
        this.columnsMaxCount = configuration.columnsMaxCount;
      }
      if (typeof configuration.textSummaryMaxLength === 'number') {
        this.textSummaryMaxLength = configuration.textSummaryMaxLength;
      }
      if (typeof configuration.spaceBetweenColumns === 'number') {
        this.spaceBetweenColumns = configuration.spaceBetweenColumns;
      }
      if (typeof configuration.buttonsMaxCount === 'number') {
        this.buttonsMaxCount = configuration.buttonsMaxCount;
      }
    }
  }

  /**
   * Get item from cache
   * @param {string} key - Key to get item
   * @param {string=} type - Type of the item
   * @param {string=} chatId - Chat Id
   * @returns {any} - Item value
   **/
  getValue(key, type, chatId = null) {
    let result = null;
    if (this.isRoot === true) {
      result = this.#getValue(MenuItem.getValueKey(key, chatId), type);
    } else {
      const root = this.getRoot();
      if (root) {
        result = root.getValue(key, type, chatId);
      }
    }
    return result;
  }

  /**
   * Store item to cache
   * @param {string} key - Key to set item
   * @param {any} value - Item value
   * @param {string=} chatId - Chat Id
   **/
  setValue(key, value, chatId = null) {
    if (this.isRoot === true) {
      this.#setValue(MenuItem.getValueKey(key, chatId), value);
    } else {
      const root = this.getRoot();
      if (root) root.setValue(key, value, chatId);
    }
  }

  /**
   * Remove item from cache
   * @param {string} key - Key to remove item
   * @param {string=} chatId - Chat Id
   **/
  removeValue(key, chatId = null) {
    if (this.isRoot === true) {
      this.#removeValue(key, MenuItem.getValueKey(key, chatId));
    } else {
      const root = this.getRoot();
      if (root) root.removeValue(key, chatId);
    }
  }

  /**
   * Get message Id
   * @param {string} chatId - Chat Id
   * @returns {number} - Message Id
   **/
  getMessageId(chatId) {
    return this.getValue(MenuItem.MenuMessageId, 'number', chatId) || 0;
  }

  /**
   * Set message Id
   * @param {string} chatId - Chat Id
   * @param {number} messageId - Message Id
   **/
  setMessageId(chatId, messageId) {
    this.setValue(MenuItem.MenuMessageId, messageId, chatId);
  }

  /**
   * Remove message Id
   * @param {string} chatId - Chat Id
   **/
  removeMessageId(chatId) {
    this.removeValue(MenuItem.MenuMessageId, chatId);
  }

  /**
   * To get data to nested items
   * @param {string} command
   * @returns {any}
   */
  getData(command) {
    return null;
  }

  /**
   * To set data from the nested items
   * @param {any} data
   * @param {string} command
   * @param {object} options
   * @returns {boolean} - True if the data is set, false otherwise
   **/
  async setData(data, command) {
    return false;
  }

  setLastCommand(command, chatId) {
    if (typeof command === 'string' && command !== '' && typeof chatId === 'string' && chatId !== '') {
      this.setValue('lastCommand', command, chatId);
    }
  }

  /**
   * Update commands of the menu item and it's subordinates to root item
   **/
  updateCommands(root = null) {
    if (root !== null) {
      root.commands[this.command] = this;
      this.nested.forEach((item) => {
        item.updateCommands(root);
      });
    } else if (this.isRoot === true) {
      this.updateCommands(this);
    } else {
      const root = this.getRoot();
      if (root !== null) {
        root.updateCommands();
      }
    }
  }

  /**
   * Get root of the menu item
   * @returns {MenuItem} - Root of the menu item
   **/
  getRoot() {
    let root = this;
    if (this.isRoot === false) {
      root = root.holder.getRoot();
    }
    return root;
  }

  /**
   * Get count of nested items
   * @returns {number} - Count of nested items
   **/
  nestedCount() {
    return this.nested.length;
  }

  /**
   * Check if nested items exists
   * @returns {boolean} - True if nested items exists, false otherwise
   **/
  isNestedExists() {
    return this.nestedCount() > 0;
  }

  /**
   * Get item by command from the menu items hierarchy
   * @param {string} commandToCheck - Command to get item
   * @param {string=} chatId - Chat Id
   * @returns {MenuItem} - Item by command
   * @returns {null} - Null if item is not found
   **/
  async getByCommand(command, chatId = null) {
    let result = null;
    let commandToCheck = command;
    if (this.isRoot === true) {
      const matchOffset = MenuItem.buttonsOffsetRegex.exec(command);
      const buttonsOffset = isNaN(matchOffset?.groups?.offset) ? 0 : parseInt(matchOffset.groups.offset);
      commandToCheck = command.replace(`$bo=${buttonsOffset}`, '');
      this.setValue('buttonsOffset', buttonsOffset, chatId);
    }
    if (this.command === commandToCheck || (this.isRoot && commandToCheck === MenuItem.cmdExit)) {
      if (commandToCheck !== commandToCheck) {
        this.removeValue('lastCommand', chatId);
      }
      result = this;
    } else {
      if (this.isRoot === false) await this.refresh();
      for (const item of this.nested) {
        result = await item.getByCommand(commandToCheck);
        this.log('debug', `command: ${command}, commandToCheck: ${commandToCheck}, item.label: ${stringify(item.label)}`);
        if (result !== null) {
          break;
        }
      }
      this.log('debug', `command: ${command}, commandToCheck: ${command}, label: ${stringify(result?.label)}`);
    }
    if (result !== null && result !== undefined) {
      if (this.isRoot === true) this.setLastCommand(command, chatId);
    } else {
      result = null;
    }
    return result;
  }

  /**
   * Create button
   * @returns {Button} - Button
   **/
  createButton() {
    return makeButton(this.label, this.command);
  }

  /**
   * Get buttons of the menu item build from the nested items
   * @param {string} chatId - Chat Id
   * @returns {Array<Array<Button>>} - Buttons of the menu item
   **/
  getButtons(chatId) {
    let buttons = [],
      nestedCount = this.nestedCount(),
      row = [];
    if (nestedCount > 0) {
      const root = this.getRoot(),
        maxColumns = root.columnsMaxCount || menuDefaults.columnsMaxCount,
        maxTextLength = root.textSummaryMaxLength || menuDefaults.textSummaryMaxLength,
        spaceBetweenColumns = root.spaceBetweenColumns || menuDefaults.spaceBetweenColumns,
        buttonsMaxCount = root.buttonsMaxCount || menuDefaults.buttonsMaxCount,
        buttonsOffset = root.getValue('buttonsOffset', 'number', chatId) || 0;
      let groupCurrent = '',
        itemLabelMaxLength = 0,
        nested = this.nested.slice(buttonsOffset, buttonsOffset + buttonsMaxCount),
        nestedCountCurrent = nested.length;
      nestedCountCurrent--;
      for (let index = 0; index < nested.length; index++) {
        const item = nested[index];
        if (item !== null && item !== undefined) {
          const itemLabelLength = MenuItem.getStringLength(item.label);
          this.log('debug', `index: ${index}, label: ${item.label},` + ` command: ${item.command}, group: ${item.group}`);
          if (item.group !== groupCurrent) {
            if (row.length > 0) {
              buttons.push(row);
              row = [];
            }
            groupCurrent = item.group;
          }
          if (itemLabelMaxLength < itemLabelLength) {
            itemLabelMaxLength = itemLabelLength;
          }
          if (maxTextLength > 0 && (row.length + 1) * itemLabelMaxLength + row.length * spaceBetweenColumns > maxTextLength) {
            buttons.push(row);
            row = [];
            itemLabelMaxLength = 0;
          }
          row.push(item.createButton());
          if ((maxColumns > 0 && row.length === maxColumns) || index === nestedCountCurrent) {
            buttons.push(row);
            row = [];
          }
        }
      }
      if (nestedCount > buttonsMaxCount) {
        const pageCurrent = Math.trunc(buttonsOffset / buttonsMaxCount) + 1;
        if (buttonsOffset >= buttonsMaxCount) {
          if (Math.trunc(buttonsOffset / buttonsMaxCount) > 1) {
            row.push(makeButton('#1 <<', `${this.command}`));
          }
          row.push(makeButton(`#${pageCurrent - 1} <`, `${this.command}$bo=${buttonsOffset - buttonsMaxCount}`));
        }
        if (buttonsOffset + buttonsMaxCount < nestedCount) {
          row.push(makeButton(`> #${pageCurrent + 1}`, `${this.command}$bo=${buttonsOffset + buttonsMaxCount}`));
          if (Math.trunc((nestedCount - buttonsOffset) / buttonsMaxCount) > 1) {
            const lastOffset =
              nestedCount % buttonsMaxCount === 0
                ? nestedCount - buttonsMaxCount
                : Math.trunc(nestedCount / buttonsMaxCount) * buttonsMaxCount;
            row.push(makeButton(`>> #${lastOffset / buttonsMaxCount + 1}`, `${this.command}$bo=${lastOffset}`));
          }
        }
        buttons.push(row);
        row = [];
      }
    }
    row.push(makeButton(i18n.__('Exit'), MenuItem.cmdExit));
    if (this.holder !== null) {
      if (this.getRoot().command !== this.holder.command) {
        row.unshift(makeButton(i18n.__('Home'), this.getRoot().command));
      }
      row.unshift(makeButton(i18n.__('Back'), this.holder.command));
    }
    buttons.push(row);
    return buttons;
  }

  /**
   * Refresh menu item
   * @param {boolean=} force - True to force refresh, false otherwise
   **/
  async refresh(force = false) {
    return true;
  }

  /**
   * Draw menu item
   * @param {TelegramClient} client - Telegram client
   * @param {string} peerId - Peer Id
   **/
  async draw(client, peerId) {
    this.log('debug', `label: ${this.label}, text: ${this.text}`);
    const refreshed = await this.refresh();
    this.log('debug', `Refreshed with result: ${refreshed}!`);
    if (refreshed === true) {
      const menuMessageId = this.getMessageId(peerId?.userId),
        buttons = this.getButtons(peerId?.userId);
      this.log('debug', `menuMessageId: ${menuMessageId}, buttons: ${stringifyButtons(buttons)}`);
      if (client !== null && peerId !== null) {
        client.isBot().then((isBot) => {
          const messageParams = {};
          if (Array.isArray(buttons) && buttons.length > 0) {
            messageParams.buttons = buttons;
          }
          if (isBot && menuMessageId !== 0) {
            messageParams.message = menuMessageId;
            messageParams.text = this.text;
            this.log(
              'debug',
              `${this.constructor.name}.draw{'${this.command}'}| `,
              `Going to edit message: ${menuMessageId} with messageParams: ${stringifyButtons(messageParams)}`,
            );
            client
              .editMessage(peerId, messageParams)
              .then((res) => {
                this.log('debug', `${this.constructor.name}.draw{'${this.command}'}| `, `Message edited successfully!`);
                client.isBot().then((isBot) => {
                  if (isBot) {
                    this.setMessageId(peerId?.userId, res.id);
                  }
                });
              })
              .catch((err) => {
                if (err.code === 400 && err.errorMessage === 'MESSAGE_ID_INVALID') {
                  this.log(
                    'debug',
                    `${this.constructor.name}.draw{'${this.command}'}| `,
                    `Message Id is invalid! Going to send new message!`,
                  );
                  this.removeMessageId(peerId?.userId);
                  this.draw(client, peerId);
                } else {
                  this.log(
                    'warn',
                    `${this.constructor.name}.draw{'${this.command}'}| `,
                    `Message edit error: ${stringify(err)},  menuMessageId: ${menuMessageId}, text: ${this.text}`,
                  );
                }
              });
          } else {
            messageParams.message = this.text;
            this.log(
              'debug',
              `${this.constructor.name}.draw{'${this.command}'}| `,
              `Going to send new message ` + `with messageParams: ${stringifyButtons(messageParams)}!`,
            );
            client
              .sendMessage(peerId, messageParams)
              .then((res) => {
                this.log('debug', `${this.constructor.name}.draw{'${this.command}'}| `, `Message sent successfully!`);
                client.isBot().then((isBot) => {
                  if (isBot) {
                    this.setMessageId(peerId?.userId, res.id);
                  }
                });
              })
              .catch((err) => {
                this.log(
                  'warn',
                  `${this.constructor.name}.draw{'${this.command}'}| `,
                  `Message send error: ${stringify(err)}, text: ${this.text},  menuMessageId: ${menuMessageId}`,
                );
              });
          }
        });
      }
    } else if (this.holder !== null) {
      this.holder.draw(client, peerId);
    }
  }

  /**
   * Handle command
   * @param {TelegramClient} client - Telegram client
   * @param {any} peerId - Peer Id
   * @param {number} messageId - Message Id
   * @param {string} command - Command to handle
   * @param {boolean=} isEvent - True if the command is event, false otherwise
   * @param {boolean=} isBot - True if the command is from bot, false otherwise
   * @param {boolean=} isTarget - True if the command is target, false otherwise
   **/
  async onCommand(client, peerId, messageId, command, isEvent = true, isBot = false, isTarget = false) {
    const menuMessageId = this.getMessageId(peerId?.userId);
    this.log('debug', `command: ${command}, peerId = ${stringify(peerId)}, startsWith: ${command?.startsWith(menuDefaults.cmdPrefix)}`);
    if (isTarget === true) {
      if (isBot === true && isEvent === false && messageId !== 0) {
        client
          .deleteMessages(peerId, [messageId], {revoke: true})
          .then((res) => {
            this.log('debug', `Message from User deleted successfully!`);
          })
          .catch((err) => {
            this.log('warn', `Message from User delete error: ${stringify(err)}`);
          });
      }
      if (typeof this.onRun === 'function') {
        const reDraw = await this.onRun(client, peerId, isBot, messageId, command);
        this.log('debug', `command: ${command} is executed successfully with reDraw:` + ` ${reDraw}!`, isBot);
        if (reDraw === true && menuMessageId !== 0 && isEvent === true && isBot === true) {
          client
            .deleteMessages(peerId, [menuMessageId], {revoke: true})
            .then((res) => {
              this.log('debug', `Message deleted successfully!`);
              this.removeMessageId(peerId?.userId);
              this.draw(client, peerId);
            })
            .catch((err) => {
              this.log('warn', `Message delete error: ${stringify(err)}`);
            });
        } else {
          await this.draw(client, peerId);
        }
      } else if (command === MenuItem.cmdExit && isBot === true) {
        client
          .deleteMessages(peerId, [menuMessageId], {revoke: true})
          .then((res) => {
            this.log('debug', `Message deleted successfully!`);
            this.removeMessageId(peerId?.userId);
          })
          .catch((err) => {
            this.log('warn', `Message delete error: ${stringify(err)}`);
          });
      } else {
        await this.draw(client, peerId);
      }
    } else {
      const root = this.getRoot();
      this.log('debug', `command: ${command} is not target! Commands: ${stringify(Object.keys(root?.commands))}`);
      const target = await root.getByCommand(root.processInputForCommand || command, peerId?.userId);
      this.log('debug', `target: ${stringify(target?.command)}`);
      if (target !== null) {
        await target.onCommand(client, peerId, messageId, command, isEvent, isBot, true);
      } else {
        this.log('warn', `command: ${command} is not allowed! Appropriate item is not found!`);
      }
    }
  }
}

function stringifyButtons(value, space = 0) {
  return stringify(
    value,
    (_key, value) => {
      if (value?.type === 'Buffer') {
        return Buffer.from(value.data).toString('utf8');
      } else {
        return value;
      }
    },
    space,
  );
}

/**
 * @typedef {MenuItem} MenuItem
 **/
module.exports = {
  MenuItem,
  menuDefaults,
  setFunctionMakeButton,
};
