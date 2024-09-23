const {MenuItem, menuDefaults, setFunctionMakeButton} = require('./MenuItem');
const {MenuItemStructured} = require('./MenuItemStructured');
const {SimpleLogger} = require('./MenuLogger');

let log = new SimpleLogger('info');
class MenuItemRoot extends MenuItem {
  /**
   * @param {string} label - The label of the item
   * @param {string} command - The command to execute
   * @param {string} dataId - The variable id to store the data
   * @param {object} dataStructure - The structure of the data
   * @param {boolean=} isArray - The flag to indicate if the data is an array of object, not a single object
   * @param {number=} index - The index of the data item
   * @param {function=} onSave - The function to execute on save
   */

  #sendMessage = null;
  #editMessage = null;
  #deleteMessage = null;
  #sendMessageAsync = null;
  #editMessageAsync = null;
  #deleteMessageAsync = null;

  constructor(menuStructure) {
    super(menuStructure.label, `/${menuStructure.id}`, menuStructure.text || menuStructure.label);
    this.isRoot = true;
    this.rootStructure = menuStructure;
  }

  async sendMessage(peerId, messageObject) {
    if (typeof this.#sendMessage === 'function') {
      return this.#sendMessage(peerId, messageObject);
    } else if (typeof this.#sendMessageAsync === 'function') {
      return await this.#sendMessageAsync(peerId, messageObject);
    } else {
      throw new Error('sendMessage is not set');
    }
  }

  async editMessage(peerId, messageObject) {
    if (typeof this.#editMessage === 'function') {
      return this.#editMessage(peerId, messageObject);
    } else if (typeof this.#editMessageAsync === 'function') {
      return await this.#editMessageAsync(peerId, messageObject);
    } else {
      throw new Error('editMessage is not set');
    }
  }

  async deleteMessage(peerId, messageId) {
    if (typeof this.#deleteMessage === 'function') {
      return this.#deleteMessage(peerId, messageId);
    } else if (typeof this.#deleteMessageAsync === 'function') {
      return await this.#deleteMessageAsync(peerId, messageId);
    } else {
      throw new Error('deleteMessage is not set');
    }
  }

  async init(
    {sendMessage, editMessage, deleteMessage, sendMessageAsync, editMessageAsync, deleteMessageAsync},
    level = 'info',
    logger = null,
    i18n = null,
  ) {
    if (this.setLogger(logger)) {
      this.log('debug', 'Logger is set to external logger');
    } else if (this.setLogger(new SimpleLogger(level))) {
      this.log('debug', 'Logger is set to SimpleLogger');
    } else {
      this.log('error', 'Logger is not set');
    }
    this.i18n = i18n;
    this.config(this.rootStructure.options);
    if (typeof sendMessage === 'function') {
      this.#sendMessage = sendMessage;
    }
    if (typeof editMessage === 'function') {
      this.#editMessage = editMessage;
    }
    if (typeof deleteMessage === 'function') {
      this.#deleteMessage = deleteMessage;
    }
    if (typeof sendMessageAsync === 'function') {
      this.#sendMessageAsync = sendMessageAsync;
    }
    if (typeof editMessageAsync === 'function') {
      this.#editMessageAsync = editMessageAsync;
    }
    if (typeof deleteMessageAsync === 'function') {
      this.#deleteMessageAsync = deleteMessageAsync;
    }
    for (const key of Object.keys(this.rootStructure.structure)) {
      const item = this.rootStructure.structure[key];
      await this.appendNested(new MenuItemStructured(item.label, `/${key}`, key, item.structure, item.type === 'array', -1, item.save));
    }
  }
}

module.exports = {
  MenuItemRoot,
  menuDefaults,
  setFunctionMakeButton,
};
