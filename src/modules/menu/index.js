

const {MenuItem, menuDefaults, setFunctionMakeButton} = require('./MenuItem');
const {MenuItemStructured} = require('./MenuItemStructured');

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

module.exports = {
  MenuItemRoot,
  menuDefaults,
  setFunctionMakeButton,
};
