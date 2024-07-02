/** @module menu/menu-item  **/

const stringify = require('json-stringify-safe');
const {Button} = require('telegram/tl/custom/button');
const {logDebug, logInfo, logWarning} = require('../logging/logging');
const emojiRegex = require('emoji-regex');
const i18n = require('../i18n/i18n.config');

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
  static CmdPrefix = '/';
  static CmdExit = `${MenuItem.CmdPrefix}exit`;
  static MenuMessageId = 'menuMessageId';

  static columnsMaxCountDefault = 0;
  static textSummaryMaxLengthDefault = 0;
  static spaceBetweenColumnsDefault = 1;
  static buttonsMaxCountDefault = 24;

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
   * Create button
   * @param {string} label - Label of the button
   * @param {string} command - Command of the button
   * @returns {Button} - Button
   **/
  static createButton(label, command) {
    return Button.inline(label || '?', Buffer.from(command));
  }

  #label = '';
  #command = '';
  #text = '';
  isRoot = false;
  onRun;
  group = '';
  processInputForCommand = '';
  holder = null;
  nested = new Array();
  commands = {};

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

  /**
   * Append nested item to the menu item
   * @param {MenuItem} item - Nested item to append
   * @param {number=} index - Index to append
   **/
  async appendNested(item, index = -1) {
    let result = -1;
    const root = this.getRoot(),
      command = item.command;
    logDebug(`command: ${command}, commands: ${stringify(Object.keys(root.commands))}`);
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
      logWarning(`Command '${command}' is already exists! Item can't be added to the menu!`);
    }
    return result;
  }

  /**
   * Post append operation
   **/
  async postAppend() {
    this.updateCommands();
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
    const root = this.getRoot();
    if (root) {
      result = root.getValue(key, type, chatId);
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
    const root = this.getRoot();
    if (root) root.setValue(key, value, chatId);
  }

  /**
   * Remove item from cache
   * @param {string} key - Key to remove item
   * @param {string=} chatId - Chat Id
   **/
  removeValue(key, chatId = null) {
    const root = this.getRoot();
    if (root) root.removeValue(key, chatId);
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

  /**
   * Update commands of the menu item and it's subordinates to root item
   **/
  updateCommands(root = null) {
    if (root !== null) {
      root.commands[this.command] = this;
      this.nested.forEach((item) => {
        item.updateCommands(root);
      });
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
    if (this.command === command) {
      return this;
    } else if (command.startsWith(this.command) === true) {
      await this.refresh();
      let current = null;
      for (const item of this.nested) {
        current = await item.getByCommand(command);
        logDebug(
          `MenuItem.getByCommand '${this.command}'| command: ${command}, commandToCheck: ${command}, item.label: ${stringify(item.label)}`,
        );
        if (current !== null) {
          break;
        }
      }
      logDebug(
        `MenuItem.getByCommand '${this.command}'| command: ${command}, commandToCheck: ${command}, label: ${stringify(current?.label)}`,
      );
      return current;
    } else {
      return null;
    }
  }

  /**
   * Create button
   * @returns {Button} - Button
   **/
  createButton() {
    return MenuItem.createButton(this.label, this.command);
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
        maxColumns = root.columnsMaxCount || MenuItem.columnsMaxCountDefault,
        maxTextLength = root.textSummaryMaxLength || MenuItem.textSummaryMaxLengthDefault,
        spaceBetweenColumns = root.spaceBetweenColumns || MenuItem.spaceBetweenColumnsDefault,
        buttonsMaxCount = root.buttonsMaxCount || MenuItem.buttonsMaxCountDefault,
        buttonsOffset = root.getValue('buttonsOffset', 'number', chatId) || 0;
      let groupCurrent = '',
        itemLabelMaxLength = 0,
        nested = this.nested.slice(buttonsOffset, buttonsOffset + buttonsMaxCount),
        nestedCountCurrent = nested.length;
      nestedCountCurrent--;
      nested.forEach((item, index) => {
        const itemLabelLength = MenuItem.getStringLength(item.label);
        logDebug(
          `MenuItem.getButtons '${this.command}'| index: ${index}, label: ${item.label},` +
            ` command: ${item.command}, group: ${item.group}`,
        );
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
      });
      if (nestedCount > buttonsMaxCount) {
        const pageCurrent = Math.trunc(buttonsOffset / buttonsMaxCount) + 1;
        if (buttonsOffset >= buttonsMaxCount) {
          if (Math.trunc(buttonsOffset / buttonsMaxCount) > 1) {
            row.push(MenuItem.createButton('#1 <<', `${this.command}`));
          }
          row.push(MenuItem.createButton(`#${pageCurrent - 1} <`, `${this.command}$bo=${buttonsOffset - buttonsMaxCount}`));
        }
        if (buttonsOffset + buttonsMaxCount < nestedCount) {
          row.push(MenuItem.createButton(`> #${pageCurrent + 1}`, `${this.command}$bo=${buttonsOffset + buttonsMaxCount}`));
          if (Math.trunc((nestedCount - buttonsOffset) / buttonsMaxCount) > 1) {
            const lastOffset =
              nestedCount % buttonsMaxCount === 0
                ? nestedCount - buttonsMaxCount
                : Math.trunc(nestedCount / buttonsMaxCount) * buttonsMaxCount;
            row.push(MenuItem.createButton(`>> #${lastOffset / buttonsMaxCount + 1}`, `${this.command}$bo=${lastOffset}`));
          }
        }
        buttons.push(row);
        row = [];
      }
    }
    row.push(MenuItem.createButton(i18n.__('Exit'), MenuItem.CmdExit));
    if (this.holder !== null) {
      if (this.getRoot().command !== this.holder.command) {
        row.unshift(MenuItem.createButton(i18n.__('Home'), this.getRoot().command));
      }
      row.unshift(MenuItem.createButton(i18n.__('Back'), this.holder.command));
    }
    buttons.push(row);
    logDebug(`MenuItem.getButtons '${this.command}'| Buttons: ${stringify(buttons)}`);
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
   * @returns {Promise} Promise of the draw operation result
   **/
  async draw(client, peerId) {
    logDebug(`MenuItem.draw '${this.command}'| label: ${this.label}, text: ${this.text}`);
    const refreshed = await this.refresh();
    logDebug(`MenuItem.draw '${this.command}'| Refreshed with result: ${refreshed}!`);
    if (refreshed === true) {
      const menuMessageId = this.getMessageId(peerId?.userId),
        buttons = this.getButtons(peerId?.userId);
      logDebug(`MenuItem.draw '${this.command}'| menuMessageId: ${menuMessageId}, buttons: ${stringify(buttons)}`);
      if (client === null && peerId === null) {
        logDebug(`MenuItem.draw '${this.command}'| Command debug mode is On!`, true);
        logDebug(
          `MenuItem.draw '${this.command}'| label: ${this.label}, text: ${this.text}, buttons: ${stringify(
            buttons,
            (_key, value) => {
              if (value?.type === 'Buffer') {
                return Buffer.from(value.data).toString('utf8');
              } else {
                return value;
              }
            },
            1,
          )}`,
          true,
        );
      } else {
        client.isBot().then((isBot) => {
          const messageParams = {};
          if (Array.isArray(buttons) && buttons.length > 0) {
            messageParams.buttons = buttons;
          }
          if (isBot && menuMessageId !== 0) {
            messageParams.message = menuMessageId;
            messageParams.text = this.text;
            logDebug(
              `MenuItem.draw '${this.command}'| Going to edit message: ${menuMessageId} with messageParams: ${stringify(messageParams)}`,
              true,
            );
            client
              .editMessage(peerId, messageParams)
              .then((res) => {
                logDebug(`MenuItem.draw '${this.command}'| Message edited successfully!`, true);
                client.isBot().then((isBot) => {
                  if (isBot) {
                    this.setMessageId(peerId?.userId, res.id);
                  }
                });
              })
              .catch((err) => {
                if (err.code === 400 && err.errorMessage === 'MESSAGE_ID_INVALID') {
                  logDebug(`MenuItem.draw '${this.command}'| Message Id is invalid! Going to send new message!`, true);
                  this.removeMessageId(peerId?.userId);
                  this.draw(client, peerId);
                } else {
                  logWarning(
                    `MenuItem.draw '${this.command}'| Message edit error: ${stringify(err)}, text: ${this.text}, buttons: ${stringify(
                      buttons,
                    )}`,
                    true,
                  );
                }
              });
          } else {
            messageParams.message = this.text;
            logDebug(
              `MenuItem.draw '${this.command}'| Going to send new message ` + `with messageParams: ${stringify(messageParams)}!`,
              true,
            );
            client
              .sendMessage(peerId, messageParams)
              .then((res) => {
                logDebug(`Message sent successfully!`, true);
                Object.keys(res).forEach((key) => {
                  logDebug(`  ${key}: ${stringify(res[key])}`);
                });
                client.isBot().then((isBot) => {
                  if (isBot) {
                    this.setMessageId(peerId?.userId, res.id);
                  }
                });
              })
              .catch((err) => {
                logWarning(
                  `MenuItem.draw '${this.command}'| Message send error: ${stringify(err)}, text: ${this.text}, buttons: ${stringify(
                    buttons,
                  )}`,
                  true,
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
    logDebug(
      `MenuItem.onCommand '${this.command}'| command: ${command}, peerId = ${stringify(peerId)}, startsWith: ${command?.startsWith(
        MenuItem.CmdPrefix,
      )}`,
      isBot,
    );
    if (isTarget === true) {
      if (isBot === true && isEvent === false && messageId !== 0) {
        client
          .deleteMessages(peerId, [messageId], {revoke: true})
          .then((res) => {
            logDebug(`MenuItem.onCommand '${this.command}'| Message from User deleted successfully!`, isBot);
          })
          .catch((err) => {
            logWarning(`MenuItem.onCommand '${this.command}'| Message from User delete error: ${stringify(err)}`, isBot);
          });
      }
      if (this.onRun !== null) {
        const reDraw = await this.onRun(client, peerId, isBot, messageId, command);
        logDebug(`MenuItem.onCommand '${this.command}'| command: ${command} is executed successfully with reDraw:` + ` ${reDraw}!`, isBot);
        if (reDraw === true && menuMessageId !== 0 && isEvent === true && isBot === true) {
          client
            .deleteMessages(peerId, [menuMessageId], {revoke: true})
            .then((res) => {
              logDebug(`MenuItem.onCommand '${this.command}'| Message deleted successfully!`, isBot);
              this.removeMessageId(peerId?.userId);
              this.draw(client, peerId);
            })
            .catch((err) => {
              logWarning(`MenuItem.onCommand '${this.command}'| Message delete error: ${stringify(err)}`, isBot);
            });
        } else {
          await this.draw(client, peerId);
        }
      } else if (command === MenuItem.CmdExit && isBot === true) {
        client
          .deleteMessages(peerId, [menuMessageId], {revoke: true})
          .then((res) => {
            logDebug(`MenuItem.onCommand '${this.command}'| Message deleted successfully!`, isBot);
            this.removeMessageId(peerId?.userId);
          })
          .catch((err) => {
            logWarning(`MenuItem.onCommand '${this.command}'| Message delete error: ${stringify(err)}`, isBot);
          });
      } else {
        await this.draw(client, peerId);
      }
    } else {
      const root = this.getRoot();
      logDebug(
        `MenuItem.onCommand '${this.command}'| command: ${command} is not target! Commands: ${stringify(Object.keys(root?.commands))}`,
        isBot,
      );
      const target = await root.getByCommand(root.processInputForCommand || command, peerId?.userId);
      logDebug(`MenuItem.onCommand '${this.command}'| target: ${stringify(target)}`, isBot);
      if (target !== null) {
        await target.onCommand(client, peerId, messageId, command, isEvent, isBot, true);
      } else {
        logWarning(`MenuItem.onCommand '${this.command}'| command: ${command} is not allowed! Appropriate item is not found!`, isBot);
      }
    }
  }
}

class MenuItemRoot extends MenuItem {
  static buttonsOffsetRegex = new RegExp(`^${MenuItem.CmdPrefix}.+?\\$bo=(?<offset>\\d+)$`);

  isRoot = true;
  columnsMaxCount = 0;
  textSummaryMaxLength = 0;
  spaceBetweenColumns = 1;

  #getValue = (key, type, chatId) => null;
  #setValue = (key, value, chatId) => {};
  #removeValue = (key, chatId) => {};

  /**
   * @param {string|function} label - Label of the menu item
   * @param {string|function} command - Command of the menu item
   * @param {string|function} text - Text of the menu item
   * @property {function} getValue - Get value from cache
   * @property {function} setValue - Set value to cache
   * @property {function} removeValue - Remove value from cache
   * @param {number=} columnsMaxCount - Maximum columns of the menu item
   * @param {number=} textSummaryMaxLength - Maximum length of the text summary
   * @param {number=} spaceBetweenColumns - Space between columns
   * @param {number=} buttonsMaxCount - Maximum buttons count
   **/
  constructor(
    label,
    command,
    text,
    getValue,
    setValue,
    removeValue,
    columnsMaxCount = MenuItem.columnsMaxCountDefault,
    textSummaryMaxLength = MenuItem.textSummaryMaxLengthDefault,
    spaceBetweenColumns = MenuItem.spaceBetweenColumnsDefault,
    buttonsMaxCount = MenuItem.buttonsMaxCountDefault,
  ) {
    super(label, command, text, null, '');
    this.columnsMaxCount = columnsMaxCount;
    this.textSummaryMaxLength = textSummaryMaxLength;
    this.spaceBetweenColumns = spaceBetweenColumns;
    this.buttonsMaxCount = buttonsMaxCount;
    this.buttonsOffset = 0;
    if (typeof getValue === 'function') {
      this.#getValue = getValue;
    }
    if (typeof setValue === 'function') {
      this.#setValue = setValue;
    }
    if (typeof removeValue === 'function') {
      this.#removeValue = removeValue;
    }
    logDebug(
      `MenuItemRoot '${this.command}'| typeof getValue: ${typeof getValue}, typeof setValue: ${typeof setValue}, ` +
        `typeof removeValue: ${typeof removeValue}`,
    );
  }

  /**
   * Get key for the value
   * @param {string} key - Key to get item
   * @param {string=} chatId - Chat Id
   * @returns {string} - Key for the value
   **/
  getValueKey(key, chatId = null) {
    return chatId ? `${key}.${chatId}` : key;
  }

  /**
   * Get value from cache
   * @param {string} key - Key to get item
   * @param {string=} type - Type of the item
   * @param {string=} chatId - Chat Id
   * @returns {any} - Item value
   **/
  getValue(key, type, chatId) {
    const keyId = this.getValueKey(key, chatId);
    return this.#getValue(keyId, type);
  }

  /**
   * Set value to cache
   * @param {string} key - Key to set item
   * @param {any} value - Item value
   * @param {string=} chatId - Chat Id
   **/
  setValue(key, value, chatId) {
    const keyId = this.getValueKey(key, chatId);
    this.#setValue(keyId, value);
  }

  /**
   * Remove value from cache
   * @param {string} key - Key to remove item
   * @param {string=} chatId - Chat Id
   **/
  removeValue(key, chatId) {
    const keyId = this.getValueKey(key, chatId);
    this.#removeValue(keyId);
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
    this.commands = {[this.command]: this};
    this.nested.forEach((item) => {
      item.updateCommands(this);
    });
  }

  /**
   * Get item by command from the menu items hierarchy
   * @param {string} commandToCheck - Command to get item
   * @param {string=} chatId - Chat Id
   * @returns {MenuItem} - Item by command
   * @returns {null} - Null if item is not found
   **/
  async getByCommand(command, chatId = '') {
    const matchOffset = MenuItemRoot.buttonsOffsetRegex.exec(command),
      buttonsOffset = isNaN(matchOffset?.groups?.offset) ? 0 : parseInt(matchOffset.groups.offset),
      commandToCheck = command.replace(`$bo=${buttonsOffset}`, '');
    let result = null;
    this.setValue('buttonsOffset', buttonsOffset, chatId);
    if (this.command === commandToCheck  || commandToCheck === MenuItem.CmdExit) {
      if (commandToCheck === MenuItem.CmdExit) {
        this.removeValue('lastCommand', chatId);
      }
      result = this;
    } else {
      for (const item of this.nested) {
        result = await item.getByCommand(commandToCheck);
        logDebug(
          `MenuItemRoot.getByCommand '${this.command}'| command: ${command}, commandToCheck: ${commandToCheck}, item.label: ${stringify(
            item.label,
          )}`,
        );
        if (result !== null) {
          break;
        }
      }
      logDebug(
        `MenuItemRoot.getByCommand '${this.command}'| command: ${command}, commandToCheck: ${command}, label: ${stringify(result?.label)}`,
      );
    }
    if (result !== null && result !== undefined) {
      this.setLastCommand(command, chatId);
    } else {
      result = null;
    }
    return result;
  }
}

/**
 * @typedef {MenuItem} MenuItem
 **/
module.exports = {
  MenuItem,
  MenuItemRoot,
};
