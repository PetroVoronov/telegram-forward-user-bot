/* eslint-disable sonarjs/public-static-readonly */
const stringify = require('json-stringify-safe');
const {MenuItem, menuDefaults} = require('./MenuItem');

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

  set label(value) {
    super.label = value;
  }

  get label() {
    let result = super.label;
    const value = this.getData();
    this.log('debug', `label: ${result}, command: ${this.command}, value: ${stringify(value)}`);
    result += ` [${this.valueToText(value) || '?'}]`;
    return result;
  }

  set text(value) {
    super.text = value;
  }

  get text() {
    let result = super.text;
    const value = this.getData();
    this.log('debug', `text: ${result}, command: ${this.command}, value: ${stringify(value)}`);
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
   * @param {any} peerId - Peer Id
   * @param {number} userId - Message Id
   * @param {number} messageId - Message Id
   * @param {string} command - Command to handle
   * @param {boolean=} isEvent - True if the command is event, false otherwise
   * @param {boolean=} isTarget - True if the command is target, false otherwise
   **/
  async onCommand(peerId, userId, messageId, command, isEvent = true, isTarget = false) {
    if (isTarget === false) {
      await super.onCommand(peerId, userId, messageId, command, isEvent, isTarget);
    } else {
      const value = this.getData();
      if ((await this.setData(!value)) === true) {
        await this.holder.draw(peerId, userId);
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
  constructor(label, command, prompt = '', template = '', group = '') {
    super(label, command, prompt, group);
    this.prompt = prompt;
    this.promptParams = {label: label};
    if (template !== '') {
      this.template = template;
    }
  }

  get text() {
    let result = '';
    if (this.lastInput !== '') {
      result = `${this.i18nTranslate('Wrong input')}: "${this.lastInput}!\n`;
    }
    result += this.getPrompt();
    return result;
  }

  getPrompt() {
    let result = '';
    if (this.prompt === '') {
      let templateText = typeof this.template === 'function' ? this.template()?.text : this.template;
      if (templateText !== '' && templateText !== undefined) {
        templateText = `(${this.i18nTranslate('template')}: "${templateText}")`;
      }
      result = this.i18nTranslate(MenuButtonInputText.prompt, {...this.promptParams, template: templateText});
    } else {
      result = this.prompt;
    }
    return result;
  }


  /**
   * Get buttons of the menu item build from the nested items
   * @param {string} chatId - Chat Id
   * @returns {Array<Array<Button>>} - Buttons of the menu item
   **/
  getButtons() {
    if (this.processInputForCommand === this.command) {
      const buttons = [];
      const row = [];
      row.push(this.makeButton(this.i18nTranslate('Cancel'), `${MenuItem.cmdCancel}${this.holder?.command}`));
      buttons.push(row);
      return buttons;
    } else {
      return super.getButtons();
    }
  }

  convertInput(input) {
    return input;
  }

  /**
   * Handle command
   * @param {any} peerId - Peer Id
   * @param {number} userId - Message Id
   * @param {number} messageId - Message Id
   * @param {string} command - Command to handle
   * @param {boolean=} isTarget - True if the command is target, false otherwise
   **/
  async onCommand(peerId, userId, messageId, command, isEvent = true, isTarget = false) {
    if (isTarget === false) {
      await super.onCommand(peerId, userId, messageId, command, isEvent, isTarget);
    } else {
      const root = this.getRoot();
      if (root !== null) {
        if (root.processInputForCommand === '') {
          this.log('info', `root.processInputForCommand is empty`);
          root.processInputForCommand = this.command;
          this.processInputForCommand = this.command;
          await this.draw(peerId, userId);
        } else if (root.processInputForCommand === this.command) {
          this.log('info', `root.processInputForCommand is ${this.command}`);
          let accepted = true;
          if (this.template !== '') {
            const template = this.template;
            if (typeof template === 'function') {
              accepted = template(command).result;
            } else if (typeof template === 'string') {
              accepted = RegExp(template).exec(command) !== null;
            }
          }
          try {
            await this.deleteMessage(peerId, messageId);
          } catch (error) {
            this.log('warn', `Input from user delete error: ${stringify(error)}`);
          }
          if (accepted === true) {
            root.processInputForCommand = '';
            this.processInputForCommand = '';
            if ((await this.setData(this.convertInput(command))) === true) {
              await this.holder.refresh();
            }
            await this.holder.draw(peerId, userId);
          } else {
            this.lastInput = command;
            await this.draw(peerId, userId);
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
    super(label, command, prompt, '', group);
    this.options = options;
    this.template = (input) => {
      if (input === undefined || input === null) {
        return {result: false, text: this.getPrompt()};
      } else {
        let result = RegExp(MenuButtonInputInteger.templateInteger).exec(input) !== null;
        if (result === true) {
          const value = this.convertInput(input);
          result =
            (typeof this.options.min !== 'number' || value >= this.options.min) &&
            (typeof this.options.max !== 'number' || value <= this.options.max) &&
            (typeof this.options.step !== 'number' || value % this.options.step === 0);
        }
        if (result === false) {
          return {result: result, text: this.getPrompt()};
        } else {
          return {result: result};
        }
      }
    };
  }

  getPrompt() {
    let result = this.prompt;
    if (result === '') {
      let optionsArray = [];
      ['min', 'max', 'step'].forEach((key) => {
        if (typeof this.options[key] === 'number') {
          optionsArray.push(`${this.i18nTranslate(key)}: ${this.options[key]}`);
        }
      });
      const optionsText = optionsArray.length > 0 ? `(${optionsArray.join(', ')})` : '';
      result = this.i18nTranslate(MenuButtonInputInteger.prompt, {...this.promptParams, options: optionsText});
    }
    return result;
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
   * @param {any} peerId - Peer Id
   * @param {number} userId - Message Id
   * @param {number} messageId - Message Id
   * @param {string} command - Command to handle
   * @param {boolean=} isEvent - True if the command is event, false otherwise
   * @param {boolean=} isTarget - True if the command is target, false otherwise
   **/
  async onCommand(peerId, userId, messageId, command, isEvent = true, isTarget = false) {
    if (isTarget === false) {
      await super.onCommand(peerId, userId, messageId, command, isEvent, isTarget);
    } else {
      this.log('debug', `command: ${command}`);
      let commandNew = this.holderCommand;
      if (typeof this.holder?.newItem === 'function') {
        const index = await this.holder.newItem();
        if (index >= 0) {
          commandNew = `${this.holderCommand}#${index}`;
        }
      }
      await super.onCommand(peerId, userId, messageId, commandNew, isEvent, false);
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
    this.isAsync = false;
  }

  async updateList() {
    if (typeof this.getList === 'function') {
      const data = this.getData(`${this.command.split('?')[0]}?`);
      if (this.isAsync === true) {
        this.list = await this.getList(data);
      } else {
        this.list = this.getList(data);
      }
    }
  }

  valueToText(value) {
    let result = null;
    if (this.holder !== null) {
      const value = this.holder.getData(this.command);
      this.log('debug', `label: ${result}, command: ${this.command}, value: ${stringify(value)}`);
      if (value !== null && this.list !== null && this.list.has(value)) {
        result = this.list.get(value);
      }
    }
    return result;
  }

  async postAppend() {
    await super.postAppend();
    await this.updateList();
  }

  async refresh(force = false) {
    const thisData = this.getData();
    let nestedCount = this.nestedCount();

    await this.updateList();

    const list = Array.from(this.list);
    const listLength = list.length;

    if (force === true || nestedCount !== listLength) {
      while (nestedCount > 0) {
        this.removeNested(null, 0);
        nestedCount--;
      }
    }

    for (const [index, [key, value]] of list.entries()) {
      const current = key === thisData;
      if (index < nestedCount) {
        const item = this.nested[index];
        if (item.key !== key || item.value !== value) {
          this.removeNested(null, index);
          this.log('debug', `replace ${index} by this.label: ${this.label}, key: ${key}, value: ${value}, thisData: ${thisData}`);
          await this.appendNested(new MenuButtonListItem(key, value, current, this.group), index);
        } else {
          this.log('debug', `keep ${index} this.label: ${this.label}, key: ${key}, value: ${value}, thisData: ${thisData}`);
          if (typeof this.nested[index]?.current === 'boolean') {
            this.nested[index].current = current;
          }
        }
      } else {
        this.log('debug', `append new this.label: ${this.label}, key: ${key}, value: ${value}, thisData: ${thisData}`);
        await this.appendNested(new MenuButtonListItem(key, value, current, this.group));
      }
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
    this.isAsync = true;
  }
}
class MenuButtonListItem extends MenuButton {
  constructor(key, value, current = false, group = '') {
    super(value, '', value, group);
    this.current = current;
    this.key = key;
    this.value = value;
  }

  get label() {
    return (this.current ? '[X] ' : '') + this.labelShort;
  }

  postAppend() {
    this.command = `${this.holder.command}$v=${this.key}`;
    super.postAppend();
  }

  /**
   * Handle command
   * @param {any} peerId - Peer Id
   * @param {number} userId - Message Id
   * @param {number} messageId - Message Id
   * @param {string} command - Command to handle
   * @param {boolean=} isEvent - True if the command is event, false otherwise
   * @param {boolean=} isTarget - True if the command is target, false otherwise
   **/
  async onCommand(peerId, userId, messageId, command, isEvent = true, isTarget = false) {
    if (isTarget === false || this.holder === null) {
      await super.onCommand(peerId, userId, messageId, command, isEvent, isTarget);
    } else {
      const value = this.command.split('$').pop();
      if (value.includes('v=')) {
        this.holder.setData(value.replace('v=', ''));
      }
      if (this.holder.holder !== null) {
        await this.holder.holder.draw(peerId, userId);
      }
    }
  }
}

class MenuButtonDeleteItem extends MenuButtonListTyped {
  static deleteDelete = 'Delete';
  static deleteConfirm = 'Confirm';
  static commandSuffix = '@delete';
  constructor(command) {
    const commandDelete = `${command}?${MenuButtonDeleteItem.commandSuffix}`;
    super('', commandDelete, '', null, 'string', 'delete');
    this.list = new Map([['confirm', this.i18nTranslate(MenuButtonDeleteItem.deleteConfirm)]]);
    this.label = this.i18nTranslate(MenuButtonDeleteItem.deleteDelete);
    this.text = this.i18nTranslate(MenuButtonDeleteItem.deleteDelete);
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
};
