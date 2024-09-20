

const {MenuItem, menuDefaults, setFunctionMakeButton, setMenuItemLogLevel, setMenuItemLogger} = require('./MenuItem');
const {MenuItemStructured, setMenuStructuredLogLevel, setMenuStructuredLogger} = require('./MenuItemStructured');
const {setMenuButtonLogLevel, setMenuButtonLogger} = require('./MenuButton');
const {SimpleLogger, setLogger, setLogLevel} = require('./MenuLogger');

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
  constructor(menuStructure) {
    super(menuStructure.label, `/${menuStructure.id}`, menuStructure.text || menuStructure.label);
    this.isRoot = true;
    this.rootStructure = menuStructure;
  }

  async init() {
    this.config(this.rootStructure.options);
    for (const key of Object.keys(this.rootStructure.structure)) {
      const item = this.rootStructure.structure[key];
      await this.appendNested(new MenuItemStructured(item.label, `/${key}`, key, item.structure, item.type === 'array', -1, item.save));
    }
  }

}

function setMenuLogger(logger) {
  log = setLogger(logger);
  setMenuItemLogger(logger);
  setMenuStructuredLogger(logger);
  setMenuButtonLogger(logger);
}

function setMenuLogLevel(level) {
  setLogLevel(log, level);
  setMenuItemLogLevel(level);
  setMenuStructuredLogLevel(level);
  setMenuButtonLogLevel(level);
}


module.exports = {
  MenuItemRoot,
  menuDefaults,
  setFunctionMakeButton,
  setMenuLogger,
  setMenuLogLevel,
};
