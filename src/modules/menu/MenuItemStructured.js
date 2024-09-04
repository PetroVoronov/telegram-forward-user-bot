const stringify = require('json-stringify-safe');
const {logDebug, logInfo, logWarning, logError} = require('../logging/logging');
const {MenuItem} = require('./MenuItem');
const {
  MenuButton,
  MenuButtonBoolean,
  MenuButtonInputText,
  MenuButtonInputInteger,
  MenuButtonNewItem,
  MenuButtonListTyped,
  MenuButtonListTypedAsync,
  MenuButtonDeleteItem,
} = require('./MenuButton');
const i18n = require('../i18n/i18n.config');
const {options} = require('yargs');

class MenuItemStructured extends MenuItem {
  dataId = '';
  onSave = (data) => {};
  index = null;
  isDataHolder = false;
  data = null;
  isArray = true;
  #structure = {};

  /**
   * @param {string} label - The label of the item
   * @param {string} command - The command to execute
   * @param {string} dataId - The variable id to store the data
   * @param {object} dataStructure - The structure of the data
   * @param {boolean=} isArray - The flag to indicate if the data is an array of object, not a single object
   * @param {number=} index - The index of the data item
   * @param {function=} onSave - The function to execute on save
   */
  constructor(label, command, dataId, dataStructure, isArray = true, index = -1, onSave = null) {
    super(label, command, label, null, dataStructure.text);
    this.dataId = dataId;
    this.index = index;
    this.isArray = isArray;
    this.data = isArray === true ? new Array() : {};
    this.#structure = dataStructure;
    if (isArray === true && index >= 0 && this.#structure.plain === true) {
      this.data = undefined;
    }
    if (index < 0 || isArray === false) {
      this.isDataHolder = true;
    }
    if (this.isDataHolder === true && onSave !== null && typeof onSave === 'function') {
      this.onSave = onSave;
    }
  }

  get label() {
    let result = super.label;
    if (this.isArray === false || this.index >= 0) {
      const label = this.structure.primaryId;
      if (typeof label === 'function') {
        result = label(this.data);
      } else if (typeof label === 'string') {
        if (this.data !== null && this.data !== undefined) {
          result = this.getItemFromStructure(label.split('.'), this.data);
        } else if (this.structure.plain === true) {
          result = `[?]`;
        }
      }
      if (result === null || result === undefined) {
        result = super.label;
        if (this.isArray === true && this.index >= 0) {
          result = `${result} #${this.index}`;
        }
      }
    } else if (this.isArray === true && this.index === -1) {
      if (typeof this.structure.primaryId === 'function') {
        result += ' [';
        if (Array.isArray(this.data) && this.data.length > 0) {
          result += this.data.map((item) => this.structure.primaryId(item, true)).join(', ');
        }
        result += ']';
      } else if (this.structure.plain === true) {
        result = `${result} ${JSON.stringify(this.data).replace(/null/g, '"?"')}`;
      } else {
        result = `${result} (${this.data.length})`;
      }
    }
    return result;
  }

  get text() {
    let result = super.text;
    if (this.isArray === false || this.index >= 0) {
      let text = this.structure.text;
      if ((text === null || text === undefined) && typeof this.structure.primaryId === 'string') {
        text = this.getItemFromStructure(this.structure.primaryId.split('.'))?.text;
      }
      if (typeof text === 'function') {
        result = text(this.data);
      } else if (typeof text === 'string') {
        result = text;
      }
      if (text === null || text === undefined) {
        result = this.label;
      } else {
        if ((this.isArray === true && this.index >= 0) || this.isArray === false) {
          let value = '?';
          if (this.data !== null && this.data !== undefined) {
            value = this.structure.primaryId ? this.getItemFromStructure(this.structure.primaryId.split('.'), this.data) : this.data;
          }
          result += `: "${value}"`;
        }
      }
    }
    return result;
  }

  get command() {
    let result = super.command;
    logDebug(`MenuItemStructured.command| index: ${this.index},  holder.data.length: ${this.holder?.data?.length}`);
    if (this.isDataHolder === false && this.holder?.isArray === true) {
      if (this.index >= 0 && this.index < this.holder.data.length) {
        result = [result, this.index].join('#');
      } else if (this.index === null || (this.index >= 0 && (this.holder?.data === undefined || this.holder?.data === null))) {
        result = null;
      }
    } else if (this.data !== null && this.index >= 0) {
      result = [result, this.index].join('#');
    }
    logDebug(`MenuItemStructured.command| result: ${result}`);
    return result;
  }

  get structure() {
    return this.#structure;
  }

  async postAppend() {
    if (this.isDataHolder === true) {
      await this.refresh();
    } else {
      this.load();
    }
  }

  isDataChanged(data) {
    let result = 0;
    if (this.isArray === true && this.index === -1) {
      result = this.data.length - data.length;
      if (result === 0) {
        for (let index = 0; index < data.length; index++) {
          result = this.itemsCompare(data[index], this.data[index]);
          if (result !== 0) {
            break;
          }
        }
      }
    } else {
      result = this.itemsCompare(data, this.data);
    }
    return result !== 0;
  }

  load() {
    let result = false;
    if (this.isDataHolder === true) {
      const data = this.getValue(this.dataId);
      result =
        (this.data === null && data !== null) ||
        (this.isArray === true && Array.isArray(data)) ||
        (this.isArray === false && !Array.isArray(data) && typeof data === 'object');
      if (result) {
        result = this.isDataChanged(data);
        this.data = data;
      }
    } else if (
      this.isArray === true &&
      this.holder !== null &&
      Array.isArray(this.holder.data) &&
      this.index >= 0 &&
      this.index < this.holder.data.length
    ) {
      const dataItem = this.holder.data[this.index] || undefined;
      result = this.isDataChanged(dataItem);
      this.data = dataItem;
    }
    return result;
  }

  save() {
    if (this.isDataHolder === true) {
      this.setValue(this.dataId, this.data);
      if (this.onSave !== null && typeof this.onSave === 'function') {
        this.onSave(this.data);
      }
    } else if (this.holder !== null && typeof this.holder.save === 'function') {
      this.holder.save();
    }
  }

  itemsCompare(a, b) {
    function objectsCompare(itemA, itemB, structure) {
      let result = 0,
        a,
        b;
      if (structure.plain === true) {
        a = {value: itemA};
        b = {value: itemB};
      } else {
        a = itemA;
        b = itemB;
      }
      if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
        const itemContent = structure.itemContent;
        for (const key of Object.keys(itemContent)) {
          if (a.hasOwnProperty(key) && b.hasOwnProperty(key)) {
            if (
              (typeof a[key] === itemContent[key].type || (Array.isArray(a[key]) && itemContent[key].type === 'array')) &&
              (typeof b[key] === itemContent[key].type || (Array.isArray(b[key]) && itemContent[key].type === 'array'))
            ) {
              switch (itemContent[key].type) {
                case 'object': {
                  result = objectsCompare(a[key], b[key], itemContent[key]);
                  break;
                }
                case 'array': {
                  result = a[key].length - b[key].length;
                  if (result === 0) {
                    for (let i = 0; i < a[key].length; i++) {
                      result = objectsCompare(a[key][i], b[key][i], itemContent[key].structure);
                      if (result !== 0) {
                        break;
                      }
                    }
                  }
                  break;
                }
                case 'string': {
                  result = a[key].localeCompare(b[key]);
                  break;
                }
                case 'number': {
                  result = a[key] - b[key];
                  break;
                }
                case 'boolean': {
                  if (a[key] === b[key]) {
                    result = 0;
                  } else if (a[key]) {
                    result = -1;
                  } else {
                    result = 1;
                  }
                  break;
                }
              }
            } else if (typeof a[key] === itemContent[key].type) {
              result = -1;
            } else if (typeof b[key] === itemContent[key].type) {
              result = 1;
            }
            if (result !== 0) {
              break;
            }
          } else if (a.hasOwnProperty(key) || b.hasOwnProperty(key)) {
            result = a.hasOwnProperty(key) ? -1 : 1;
            break;
          }
        }
      } else if (typeof a === 'object' && a !== null) {
        result = -1;
      } else if (typeof b === 'object' && b !== null) {
        result = 1;
      }
      return result;
    }
    return objectsCompare(a, b, this.structure);
  }

  getData(command) {
    let result = null;
    if (this.isDataHolder === true) {
      const splitter = this.isArray ? '#' : '?',
        commandSplitted = command.split(splitter),
        baseCommand = commandSplitted.length > 1 ? commandSplitted.slice(0, -1).join(splitter) : command,
        indexAndParams = commandSplitted.length > 1 ? commandSplitted.pop() : ''; //work only with the last index
      logDebug(
        `MenuItemStructured.getData '${this.command}'| command: ${command}, baseCommand: ${baseCommand},` +
          ` indexAndParams: ${indexAndParams}`,
      );
      if (baseCommand === this.command) {
        this.load();
        if (this.data !== null) {
          let index = -1,
            params = indexAndParams;
          const indexAndParamsArray = indexAndParams.split('?');
          if (this.isArray === true && indexAndParamsArray.length === 2) {
            index = indexAndParamsArray[0] ? Number(indexAndParamsArray[0]) : -1;
            params = indexAndParamsArray[1];
          }
          logDebug(`MenuItemStructured.getData '${this.command}'| index: ${index}, params: ${params}`);
          if ((index >= 0 && this.isArray === true && index < this.data.length) || (index === -1 && this.isArray === false)) {
            const dataItem = this.isArray ? this.data[index] : this.data;
            if (params.length === 0 || (this.structure.plain === true && params === 'value')) {
              logDebug(
                `MenuItemStructured.getData '${this.command}'| ` +
                  `params.length: ${params.length}, plain: ${this.structure.plain}, dataItem: ${stringify(dataItem)}`,
              );
              result = dataItem;
            } else {
              const path = params.split('$');
              logDebug(`MenuItemStructured.getData '${this.command}'| path: ${stringify(path)}, dataItem: ${stringify(dataItem)}`);
              if (path.length > 0) {
                result = path.reduce((acc, key) => {
                  if (acc !== undefined && acc !== null) {
                    return acc[key];
                  } else {
                    return undefined;
                  }
                }, dataItem);
              }
            }
          }
        }
      }
    } else if (this.holder !== null && typeof this.holder.getData === 'function') {
      result = this.holder.getData(command);
    }
    return result;
  }

  async setData(data, command) {
    if (this.isDataHolder === true) {
      const splitter = this.isArray ? '#' : '?',
        commandSplitted = command.split(splitter),
        baseCommand = commandSplitted.length > 1 ? commandSplitted.slice(0, -1).join(splitter) : command,
        indexAndParams = commandSplitted.length > 1 ? commandSplitted.pop() : ''; //work only with the last index
      if (baseCommand === this.command) {
        let index = -1,
          params = indexAndParams;
        const indexAndParamsArray = indexAndParams.split('?');
        if (this.isArray === true && indexAndParamsArray.length === 2) {
          index = Number(indexAndParamsArray[0]);
          params = indexAndParamsArray[1];
        }
        if ((index >= 0 && this.isArray === true && index < this.data.length) || (index === -1 && this.isArray === false)) {
          const dataItem = this.isArray ? this.data[index] : this.data,
            path = params.split('$'),
            KeyIndexMax = path.length - 1;
          let key,
            currentItem = dataItem,
            currentStructure = this.structure.itemContent;
          if (params.startsWith('@') === true) {
            if (index >= 0 && this.isArray === true && index < this.data.length) {
              logDebug(`MenuItemStructured.setData '${this.command}'| index: ${index}, params: ${params}`);
              const command = path.shift();
              // eslint-disable-next-line sonarjs/no-small-switch
              switch (command) {
                case MenuButtonDeleteItem.commandSuffix: {
                  this.data.splice(index, 1);
                  this.save();
                  await this.refresh(true);
                  break;
                }
                default: {
                  break;
                }
              }
              return true;
            }
          } else {
            for (let keyIndex = 0; keyIndex <= KeyIndexMax; keyIndex++) {
              key = path[keyIndex];
              if (currentStructure[key] !== undefined) {
                if (currentItem?.[key] === undefined || keyIndex === KeyIndexMax) {
                  if (
                    keyIndex === KeyIndexMax &&
                    (typeof data === currentStructure[key].type || (Array.isArray(data) === true && currentStructure[key].type === 'array'))
                  ) {
                    if (
                      typeof currentStructure[key].onSetBefore !== 'function' ||
                      currentStructure[key].onSetBefore(currentItem, key, dataItem, path) === true
                    ) {
                      if (this.structure.plain === true && params === 'value') {
                        if (index >= 0 && this.isArray === true && index < this.data.length) {
                          this.data[index] = data || undefined;
                        } else {
                          this.data = data || undefined;
                        }
                      } else {
                        currentItem[key] = data;
                      }
                      if (Array.isArray(currentStructure[key].onSetReset) && currentStructure[key].onSetReset.length > 0) {
                        currentStructure[key].onSetReset.forEach((resetKey) => {
                          let resetItem = currentItem,
                            resetStructure = currentStructure[key];
                          if (resetKey.startsWith('.') === true) {
                            resetKey = resetKey.slice(1);
                          } else {
                            const resetPath = resetKey.split('.');
                            resetKey = resetPath.pop();
                            if (resetPath.length > 0) {
                              resetItem = this.getItemFromStructure(resetPath, dataItem);
                              resetStructure = this.getItemFromStructure(resetPath);
                            } else {
                              resetItem = dataItem;
                              resetStructure = this.structure.itemContent;
                            }
                          }
                          if (resetItem !== undefined && resetItem.hasOwnProperty(resetKey)) {
                            if (resetStructure?.[resetKey]?.default !== undefined) {
                              resetItem[resetKey] = structuredClone(resetStructure[resetKey].default);
                            } else {
                              delete resetItem[resetKey];
                            }
                          }
                        });
                      }
                      if (typeof currentStructure[key].onSetAfter === 'function') {
                        currentStructure[key].onSetAfter(currentItem, key, dataItem, path);
                      }
                      this.save();
                      return true;
                    }
                  } else if (keyIndex < KeyIndexMax && currentStructure[key].type === 'object' && currentItem[key] === undefined) {
                    currentItem[key] = {};
                  } else {
                    break;
                  }
                } else if (keyIndex < KeyIndexMax && currentStructure[key].type === 'object' && typeof currentItem[key] === 'object') {
                  currentItem = currentItem[key];
                  currentStructure = currentStructure[key].itemContent;
                }
              }
            }
          }
        }
      }
    } else if (this.holder !== null && this.holder.isDataHolder === true) {
      return this.holder.setData(data, command);
    }
    return false;
  }

  /**
   * Append nested item
   * @param {MenuItem} item - Nested item to append
   * @param {string[]=} path - The path to the item,
   * @param {any=} value - The value of the item
   * @param {number=} index - The index of the item
   **/
  async appendNested(item, path = null, value = undefined, index = -1) {
    let indexCurrent = index,
      itemToSkip = false;
    if (item === null && Array.isArray(path) && path.length > 0) {
      const structureItem = this.getItemFromStructure(path);
      itemToSkip = this.getItemPresence(path, structureItem) !== 'mandatory' && value === undefined;
      logDebug(
        `MenuItemStructured.appendNested '${this.command}'| path: ${path.join('.')}, value: ${stringify(value)},` +
          ` item: ${stringify(structureItem)}`,
      );
      if (structureItem !== undefined && structureItem !== null && structureItem.editable === true && itemToSkip === false) {
        const command = [this.command, path.join('$')].join('?'),
          label = structureItem.label ? i18n.__(structureItem.label) : i18n.__(path.join('.')),
          text = structureItem.text ? i18n.__(structureItem.text) : i18n.__(path.slice(-1).pop()),
          group = path.length > 1 ? path.slice(0, -1).join('.') : path.slice(0).pop(),
          template = structureItem.template,
          options = structureItem.options;
        indexCurrent = this.nested.findIndex((nestedItem) => nestedItem.command === command);
        if (indexCurrent >= 0) {
          if (index < indexCurrent) {
            this.nested.splice(indexCurrent, indexCurrent - index);
            indexCurrent = index;
          }
        } else {
          indexCurrent = index;
          switch (structureItem.sourceType) {
            case 'input': {
              // eslint-disable-next-line sonarjs/no-nested-switch
              switch (structureItem.type) {
                case 'string': {
                  item = new MenuButtonInputText(label, command, '', template, group);
                  break;
                }
                case 'number': {
                  if (structureItem.subType === 'integer') {
                    item = new MenuButtonInputInteger(label, command, '', options, group);
                  }
                  break;
                }
                default: {
                  break;
                }
              }
              break;
            }
            case 'list': {
              if (typeof structureItem.sourceAsync === 'function') {
                item = new MenuButtonListTypedAsync(label, command, text, structureItem.sourceAsync, structureItem.type, group);
              } else {
                item = new MenuButtonListTyped(label, command, text, structureItem.source, structureItem.type, group);
              }
              break;
            }
            default: {
              // eslint-disable-next-line sonarjs/no-nested-switch
              switch (structureItem.type) {
                case 'boolean': {
                  item = new MenuButtonBoolean(label, command, text, group);
                  break;
                }
                case 'array': {
                  item = new MenuItemStructuredSubordinated(label, command, structureItem.structure, true);
                  break;
                }
                default: {
                  item = new MenuButton(label, command, text, group);
                  break;
                }
              }
              break;
            }
          }
        }
      }
    }
    if (item !== null) {
      return (await super.appendNested(item, indexCurrent)) + 1;
    } else if (itemToSkip === true && Array.isArray(path) && path.length > 0 && index >= 0) {
      const command = [this.command, path.join('$')].join('?');
      indexCurrent = this.nested.findIndex((nestedItem) => nestedItem.command === command);
      if (indexCurrent === index) {
        this.nested.splice(indexCurrent, 1);
      } else {
        indexCurrent = index + 1;
      }
      return indexCurrent;
    } else {
      return indexCurrent + 1;
    }
  }

  async refresh(force = false) {
    let result = true,
      buttonAdd = null;
    logDebug(`MenuItemStructured.refresh '${this.command}'| isRulesHolder: ${this.isDataHolder}`);
    if (this.isDataHolder === true && this.isArray === true) {
      const isNewRules = this.load(),
        root = this.getRoot();
      if (this.nested.length > 0 && this.nested[this.nested.length - 1] instanceof MenuButtonNewItem) {
        buttonAdd = this.nested.pop();
      }
      if (isNewRules === true || force === true) {
        if (this.data !== null && Array.isArray(this.data) && this.data.length > 0) {
          for (let index = 0; index < this.data.length; index++) {
            let dataItem = this.data[index];
            if (this.structure.plain === true && dataItem === null) {
              dataItem = undefined;
            }
            logDebug(`MenuItemStructured.refresh| index: ${index}, dataItem: ${stringify(dataItem)}`);
            if (this.nested[index] instanceof MenuItemStructured || this.nested[index] instanceof MenuItemStructuredSubordinated) {
              this.nested[index].data = dataItem;
            } else {
              await this.appendNested(
                this instanceof MenuItemStructuredSubordinated
                  ? new MenuItemStructuredSubordinated(this.labelShort, this.command, this.structure, this.isArray, index)
                  : new MenuItemStructured(this.labelShort, this.command, this.dataId, this.structure, this.isArray, index),
              );
            }
          }
        }
        for (let index = this.data?.length || 0; index < this.nested.length; index++) {
          this.nested.pop();
        }
        if (buttonAdd instanceof MenuButtonNewItem) {
          root.updateCommands();
        }
      }
      if (buttonAdd instanceof MenuButtonNewItem) {
        this.nested.push(buttonAdd);
      } else {
        await this.appendNested(new MenuButtonNewItem(i18n.__('Add'), this.command));
        root.updateCommands();
      }
    } else if (
      (this.isDataHolder === true && this.isArray === false) ||
      (this.holder !== null && this.holder.isDataHolder === true && this.holder.isArray === true)
    ) {
      logDebug(`MenuItemStructured.refresh '${this.command}'| index: ${this.index}, holder.data.length: ${this.holder?.data?.length}`);
      if (this.isArray === false || (this.index >= 0 && this.index < this.holder?.data?.length)) {
        let dataItem = this.isDataHolder === true ? this.data : this.holder.data[this.index];
        if (dataItem === null || dataItem === undefined) {
          if (this.structure.plain === true) {
            dataItem = undefined;
          } else {
            dataItem = {};
          }
        }
        if (this.isDataHolder === false) this.data = dataItem;
        let index = 0;
        if (this.structure.plain === true && typeof this.structure.itemContent.value === 'object') {
          await this.appendNested(null, ['value'], dataItem, index);
        } else {
          for (const rowId of Object.keys(this.structure.itemContent)) {
            if (this.structure.itemContent[rowId].type !== 'object') {
              index = await this.appendNested(null, [rowId], dataItem[rowId], index);
            } else {
              const row = dataItem[rowId] || {};
              for (const itemId of Object.keys(this.structure.itemContent[rowId].itemContent)) {
                index = await this.appendNested(null, [rowId, itemId], row[itemId], index);
              }
            }
          }
        }
        if (
          this.isArray === true &&
          this.index >= 0 &&
          this.index < this.holder?.data?.length &&
          this.nested.length > 0 &&
          this.nested[this.nested.length - 1] instanceof MenuButtonDeleteItem === false
        ) {
          await this.appendNested(new MenuButtonDeleteItem(this.command));
        }
      } else {
        result = false;
      }
    } else {
      result = false;
    }
    return result;
  }

  /**
   * Draw menu item
   * @param {TelegramClient} client - Telegram client
   * @param {string} peerId - Peer Id
   * @returns {Promise} Promise of the draw operation result
   **/
  async draw(client, peerId) {
    if (this.isDataHolder === true) {
      this.load();
    }
    return await super.draw(client, peerId);
  }

  /**
   * Add new item to the data
   **/
  async newItem() {
    if (this.isDataHolder === true && this.isArray === true && Array.isArray(this.data) === true) {
      let newItem;
      if (this.structure.plain === true) {
        newItem = structuredClone(this.structure?.itemContent?.value?.default);
      } else {
        newItem = {};
        Object.keys(this.structure.itemContent).forEach((rowId) => {
          if (this.getItemPresence([rowId], this.structure.itemContent[rowId]) === 'mandatory') {
            if (this.structure.itemContent[rowId].type === 'object') {
              newItem[rowId] = {};
              Object.keys(this.structure.itemContent[rowId].itemContent).forEach((itemId) => {
                if (this.getItemPresence([rowId, itemId], this.structure.itemContent[rowId].itemContent[itemId]) === 'mandatory') {
                  newItem[rowId][itemId] = structuredClone(this.structure.itemContent[rowId].itemContent[itemId].default);
                }
              });
            } else {
              newItem[rowId] = structuredClone(this.structure.itemContent[rowId].default);
            }
          }
        });
      }
      if (newItem === null) {
        newItem = undefined;
      }
      this.data.push(newItem);
      this.save();
      await this.refresh(true);
      this.getRoot()?.updateCommands();
      return this.data.length - 1;
    } else {
      return -1;
    }
  }

  /**
   * Get the label of the item
   * @param {any} value - The value of the item
   * @param {string[]} path - The path inside a structure
   * @returns {string} - The label of the item
   **/
  getRowsItemsLabels(value, ...path) {
    return `${path.join('.')}: ${value || '?'}`;
  }

  /**
   * Get the item from data structure
   * @param {string[]} path - The path inside a structure
   * @param {any=} data - The data with the defined structure
   * @returns {any} The item from the structure
   **/
  getItemFromStructure(path, data = null) {
    if (this.structure.plain === true && path.join('.') === 'value') {
      return data || this.structure.itemContent.value;
    } else {
      const last = path.length - 1;
      return path.reduce((acc, key, index) => {
        if (acc !== undefined && acc !== null) {
          if (index === last || (data !== undefined && data !== null)) {
            return acc[key];
          } else if (data === undefined || data === null) {
            return acc[key].itemContent;
          }
        } else {
          return undefined;
        }
      }, data || this.structure.itemContent);
    }
  }

  /**
   * Get the item presence
   * @param {string[]} path - The path inside a structure
   * @param {any} item - The item from the structure
   * @returns {string} - one of possible values from ['mandatory', 'optional', 'dependant', 'none']
   **/
  getItemPresence(path, item = null) {
    const presence = item !== null ? item.presence : this.getItemFromStructure(path)?.presence;
    if (typeof presence === 'string') {
      return presence;
    } else if (typeof presence === 'function') {
      return presence(this.data, path);
    } else {
      return 'none';
    }
  }
}

class MenuItemStructuredSubordinated extends MenuItemStructured {
  constructor(label, command, dataStructure, isArray = true, index = -1, onSave = null) {
    super(label, command, command, dataStructure, isArray, index, onSave);
  }

  load() {
    let result = false;
    if (this.isDataHolder === true && this.holder instanceof MenuItemStructured) {
      const data = this.holder.getData(this.dataId);
      result =
        (this.data === null && data !== null) ||
        (this.isArray === true && Array.isArray(data)) ||
        (this.isArray === false && !Array.isArray(data) && typeof data === 'object');
      if (result) {
        result = this.isDataChanged(data);
        this.data = data;
      }
    } else if (this.isDataHolder === false && this.holder instanceof MenuItemStructuredSubordinated) {
      super.load();
    }
    return result;
  }

  save() {
    if (this.isDataHolder === true && this.holder instanceof MenuItemStructured) {
      this.holder.setData(this.data, this.dataId);
      if (this.onSave !== null && typeof this.onSave === 'function') {
        this.onSave();
      }
    } else if (this.isDataHolder === false && this.holder instanceof MenuItemStructuredSubordinated) {
      this.holder.save();
    }
  }
}

module.exports = {
  MenuItemStructured,
};
