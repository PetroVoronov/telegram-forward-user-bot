/* eslint-disable sonarjs/public-static-readonly */
const stringify = require('json-stringify-safe');
const {MenuItem, menuDefaults} = require('./MenuItem');
const {SimpleLogger, setLogger, setLogLevel} = require('./menuLogger');
const i18n = require('../i18n/i18n.config');

let log = new SimpleLogger('info');

function setMenuButtonLogger(logger) {
  const newLogger = setLogger(logger);
  if (newLogger) {
    log = newLogger;
  }
}

function setMenuButtonLogLevel(level) {
  setLogLevel(log, level);
}

class MenuButton extends MenuItem {
  /**
   * @param {string|function} label - The label of the item
   * @param {string|function} command - The command to execute
   * @param {string|function} text - The text to display
   * @param {object} options - The options of item
   * @param {string} group - The group to add the item to
   */
  constructor(label, command, text, group = '') {
    super(label, command, text, null, group);
  }

  getData(command = this.command) {
    if (this.holder === null) return null;
    return this.holder.getData(command);
  }

  async setData(data, command = this.command) {
    if (this.holder !== null) {
      return this.holder.setData(data, command);
    }
    return false;
  }

  valueToText(value) {
    return value !== null && value !== undefined ? `${value}` : '';
  }

  get label() {
    let result = super.label;
    const value = this.getData();
    log.debug(`MenuButton '${this.command}'| label: ${result}, command: ${this.command}, value: ${stringify(value)}`);
    result += ` [${this.valueToText(value) || '?'}]`;
    return result;
  }

  get text() {
    let result = super.text;
    const value = this.getData();
    log.debug(`MenuButton '${this.command}'| text: ${result}, command: ${this.command}, value: ${stringify(value)}`);
    result += `: "${this.valueToText(value) || '?'}"`;
    return result;
  }
}

class MenuButtonBoolean extends MenuButton {
  /**
   * @param {string|function} label - The label of the item
   * @param {string|function} command - The command to execute
   * @param {string|function} text - The text to display
   * @param {object} options - The options of item
   * @param {string} group - The group to add the item to
   */
  constructor(label, command, text, group = '') {
    super(label, command, text, group);
  }

  valueToText(value) {
    let result = null;
    if (value !== null && value !== undefined) {
      result = value ? 'ON' : 'OFF';
    }
    return result;
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
    if (isTarget === false) {
      await super.onCommand(client, peerId, messageId, command, isEvent, isBot, isTarget);
    } else {
      const value = this.getData();
      if ((await this.setData(!value)) === true) {
        await this.holder.draw(client, peerId, messageId);
      }
    }
  }
}

class MenuButtonInputText extends MenuButton {
  static prompt = 'Please enter the "{{label}}"{{template}} value:';
  template = '';
  lastInput = '';
  /**
   * @param {string|function} label - The label of the item
   * @param {string|function} command - The command to execute
   * @param {string|function} prompt - The text to display
   * @param {string|function} template - The template for the input
   * @param {object} options - The options of item
   * @param {string} group - The group to add the item to
   */
  constructor(label, command, prompt, template = '', group = '') {
    let templateText = typeof template === 'function' ? template() : template;
    if (templateText !== '') {
      templateText = `(${i18n.__('template')}: "${templateText}")`;
    }
    super(label, command, prompt || i18n.__(MenuButtonInputText.prompt, {label: label, template:templateText}), group);
    if (template !== '') {
      this.template = template;
    }
  }

  get text() {
    let result = super.text;
    if (this.lastInput !== '') {
      result = `${i18n.__('Wrong input')}: "${this.lastInput}\n${result}"!`;
    }
    return result;
  }

  getButtons() {
    if (this.processInputForCommand === this.command) {
      return [];
    } else {
      return super.getButtons();
    }
  }

  convertInput(input) {
    return input;
  }

  /**
   * Handle command
   * @param {TelegramClient} client - Telegram client
   * @param {any} peerId - Peer Id
   * @param {number} messageId - Message Id
   * @param {string} command - Command to handle
   *
   * @param {boolean=} isBot - True if the command is from bot, false otherwise
   * @param {boolean=} isTarget - True if the command is target, false otherwise
   **/
  async onCommand(client, peerId, messageId, command, isEvent = true, isBot = false, isTarget = false) {
    if (isTarget === false) {
      await super.onCommand(client, peerId, messageId, command, isEvent, isBot, isTarget);
    } else {
      const root = this.getRoot();
      if (root !== null) {
        if (root.processInputForCommand === '') {
          log.info(`MenuButtonInputText '${this.command}'| root.processInputForCommand is empty`);
          root.processInputForCommand = this.command;
          this.processInputForCommand = this.command;
          await this.draw(client, peerId, messageId);
        } else if (root.processInputForCommand === this.command) {
          log.info(`MenuButtonInputText '${this.command}'| root.processInputForCommand is ${this.command}`);
          let accepted = true;
          if (this.template !== '') {
            const template = this.template;
            if (typeof template === 'function') {
              accepted = template(command);
            } else if (typeof template === 'string') {
              accepted = RegExp(template).exec(command) !== null;
            }
          }

          try {
            await client.deleteMessages(peerId, [messageId], {revoke: true});
          } catch (error) {
            log.warn(
              `MenuButtonInputText.onCommand '${this.command}'| Input from user delete error: ${stringify(error)}`,
              isBot,
            );
          }
          if (accepted === true) {
            root.processInputForCommand = '';
            this.processInputForCommand = '';
            if (await this.setData(this.convertInput(command)) === true) {
              await this.holder.refresh();
            }
            await this.holder.draw(client, peerId, messageId);
          } else {
            this.lastInput = command;
            await this.draw(client, peerId, messageId);
          }
        }
      }
    }
  }
}

class MenuButtonInputInteger extends MenuButtonInputText {
  static prompt = 'Please enter the "{{label}}" integer{{options}} value:';
  static templateInteger = '^[0-9]+$';

  options = {};
  constructor(label, command, prompt = '', options = {}, group = '') {
    let promptInteger = prompt;
    if (prompt === '') {
      let optionsArray = [];
      ['min', 'max', 'step'].forEach((key) => {
        if (typeof options[key] === 'number') {
          optionsArray.push(`${i18n.__(key)}: ${options[key]}`);
        }
      });
      const optionsText = optionsArray.length > 0 ? `(${optionsArray.join(', ')})` : '';
      promptInteger = i18n.__(MenuButtonInputInteger.prompt, {label: label, options: optionsText});
    }
    super(label, command, promptInteger, '', group);
    this.template = (input) => { //NOSONAR This function is intended to return two different types of values
      if (input === undefined || input === null) {
        return MenuButtonInputInteger.templateInteger;
      } else {
        let result = RegExp(MenuButtonInputInteger.templateInteger).exec(input) !== null;
        if (result === true) {
          const value = this.convertInput(input);
          result =
            (typeof options.min !== 'number' || value >= options.min) &&
            (typeof options.max !== 'number' || value <= options.max) &&
            (typeof options.step !== 'number' || value % options.step === 0);
        }
        return result;
      }
    };
  }

  convertInput(input) {
    return Number(input);
  }
}
class MenuButtonNewItem extends MenuButton {
  static commandSuffix = '@newItem';
  /**
   * @param {string|function} label - The label of the item
   * @param {string|function} command - The command to execute
   * @param {string|function} text - The text to display
   * @param {object} options - The options of item
   * @param {string} group - The group to add the item to
   */
  constructor(label, command, text, group = 'newItem') {
    super(label, `${command}${MenuButtonNewItem.commandSuffix}`, text, group);
    this.holderCommand = command;
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
    if (isTarget === false) {
      await super.onCommand(client, peerId, messageId, command, isEvent, isBot, isTarget);
    } else {
      log.debug(`MenuButtonNewItem.onCommand '${this.command}'| command: ${command}`);
      let commandNew = this.holderCommand;
      if (typeof this.holder?.newItem === 'function') {
        const index = await this.holder.newItem();
        if (index >= 0) {
          commandNew = `${this.holderCommand}#${index}`;
        }
      }
      await super.onCommand(client, peerId, messageId, commandNew, isEvent, isBot, false);
    }
  }
}

class MenuButtonListTyped extends MenuButton {
  list = new Map();
  getList = null;
  type = 'string';

  /**
   * @param {string|function} label - The label of the item
   * @param {string|function} command - The command to execute
   * @param {string|function} text - The text to display
   * @param {map|function} list - The function to get the list
   * @param {string} type - The type of the list item
   * @param {object} options - The options of item
   * @param {string} group - The group to add the item to
   */
  constructor(label, command, text, list, type = 'string', group = '') {
    super(label, command, text, group);
    if (typeof list === 'function') {
      this.getList = list;
    } else if (typeof list === 'object' && list instanceof Map) {
      this.list = list;
    }
    this.type = type;
  }

  updateList() {
    if (typeof this.getList === 'function') {
      const data = this.getData(`${this.command.split('?')[0]}?`);
      this.list = this.getList(data);
    }
  }


  valueToText(value) {
    let result = null;
    if (this.holder !== null) {
      const value = this.holder.getData(this.command);
      log.debug(
        `MenuButtonListTyped.valueToText| '${this.command}'| label: ${result}, command: ${this.command}, value: ${stringify(value)}`,
      );
      if (value !== null && this.list !== null && this.list.has(value)) {
        result = this.list.get(value);
      }
    }
    return result;
  }

  async postAppend() {
    await super.postAppend();
    this.updateList();
  }

  // draw(client, peerId, messageId) {
  //   this.refresh();
  //   super.draw(client, peerId, messageId);
  // }

  async refresh(force = false) {
    const root = this.getRoot(),
      currentValue = this.getData();
    this.nested = [];
    if (root !== null) {
      root.updateCommands();
    }
    this.updateList();
    for (const [key, value] of this.list) {
      log.debug(`MenuButtonListTyped.refresh| this.label: ${this.label}, key: ${key}, value: ${value}`);
      const command = typeof key === 'string' && key.startsWith(menuDefaults.cmdPrefix) ? key : `${this.command}$v=${key}`;
      await this.appendNested(new MenuButtonListItem(value, command, value, key === currentValue, this.group));
    }
    return true;
  }

  async setData(data, command = this.command) {
    switch (this.type) {
      case 'number': {
        data = Number(data);
        break;
      }
      case 'boolean': {
        data = Boolean(data);
        break;
      }
      default: {
        data = String(data);
        break;
      }
    }
    return await super.setData(data, command);
  }
}

class MenuButtonListTypedAsync extends MenuButtonListTyped {
  #refreshed = false;

  /**
   * @param {string|function} label - The label of the item
   * @param {string|function} command - The command to execute
   * @param {string|function} text - The text to display
   * @param {map|function} list - The function to get the list
   * @param {string} type - The type of the list item
   * @param {object} options - The options of item
   * @param {string} group - The group to add the item to
   */
  constructor(label, command, text, list, type = 'string', group = '') {
    super(label, command, text, list, type, group);
  }

  async updateList() {
    if (typeof this.getList === 'function') {
      this.list = await this.getList(this.getData(`${this.command.split('?')[0]}?`));
    }
  }

  async postAppend() {
    await super.postAppend();
    await this.updateList();
    log.debug(`MenuButtonListTypedAsync.postAppend|this.label: ${this.label}, this.list: ${stringify(this.list)}`);
  }

  async refresh(force) {
    if (this.#refreshed === false) {
      const root = this.getRoot(),
        thisData = this.getData();
      this.nested = [];
      if (root !== null) {
        root.updateCommands();
      }
      await this.updateList();
      for (const [key, value] of this.list) {
        log.debug(`MenuButtonListTypedAsync.refresh|this.label: ${this.label}, key: ${key}, value: ${value}, thisData: ${thisData}`);
        await this.appendNested(new MenuButtonListItem(value, `${this.command}$v=${key}`, value, key === thisData, this.group));
      };
    }
    return true;
  }
}
class MenuButtonListItem extends MenuButton {
  constructor(label, command, text, current = false, group = '') {
    super(label, command, text, group);
    this.current = current;
  }

  get label() {
    return (this.current ? '[X] ' : '') + this.labelShort;
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
    if (isTarget === false || this.holder === null) {
      await super.onCommand(client, peerId, messageId, command, isEvent, isBot, isTarget);
    } else {
      const value = this.command.split('$').pop();
      if (value.includes('v=')) {
        this.holder.setData(value.replace('v=', ''));
      }
      if (this.holder.holder !== null) {
        await this.holder.holder.draw(client, peerId, messageId);
      }
    }
  }
}

class MenuButtonDeleteItem extends MenuButtonListTyped {
  static deleteDelete = 'Delete';
  static deleteConfirm = 'Confirm';
  static commandSuffix = '@delete';
  constructor(command) {
    const commandDelete = `${command}?${MenuButtonDeleteItem.commandSuffix}`,
      listDelete = new Map([['confirm', i18n.__(MenuButtonDeleteItem.deleteConfirm)]]);
    super(
      i18n.__(MenuButtonDeleteItem.deleteDelete),
      commandDelete,
      i18n.__(MenuButtonDeleteItem.deleteDelete),
      listDelete,
      'string',
      'delete',
    );
  }
}

module.exports = {
  MenuButton,
  MenuButtonBoolean,
  MenuButtonInputText,
  MenuButtonInputInteger,
  MenuButtonNewItem,
  MenuButtonListTyped,
  MenuButtonListTypedAsync,
  MenuButtonDeleteItem,
  setMenuButtonLogger,
  setMenuButtonLogLevel,
};
