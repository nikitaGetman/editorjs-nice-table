const { TableCore } = require('./tableCore');
const toolboxIcon = require('./img/toolboxIcon.svg');
const insertColAfter = require('./img/insertColAfter.svg');
const insertRowAfter = require('./img/insertRowAfter.svg');

const Icons = {
  Toolbox: toolboxIcon,
  InsertColAfter: insertColAfter,
  InsertRowAfter: insertRowAfter
};

/**
 *  Tool for table's creating
 *  @typedef {object} TableData - object with the data transferred to form a table
 *  @property {string[][]} content - two-dimensional array which contains table content
 */
class Table {
  /**
   * Allow to press Enter inside the CodeTool textarea
   * @returns {boolean}
   * @public
   */
  static get enableLineBreaks() {
    return true;
  }

  /**
   * Get Tool toolbox settings
   * icon - Tool icon's SVG
   * title - title to show in toolbox
   *
   * @return {{icon: string, title: string}}
   */
  static get toolbox() {
    return {
      icon: Icons.Toolbox,
      title: 'Table'
    };
  }

  /**
   * Render plugin`s main Element and fill it with saved data
   * @param {TableData} data — previously saved data
   * @param {object} config - user config for Tool
   * @param {object} api - Editor.js API
   */
  constructor({ data, config, api }) {
    this.api = api;

    this._table = new TableCore(data, config, api);

    this.actions = [
      {
        actionName: 'InsertColAfter',
        icon: Icons.InsertColAfter
      },
      {
        actionName: 'InsertRowAfter',
        icon: Icons.InsertRowAfter
      }
    ];
  }

  /**
   * perform selected action
   * @param actionName {string} - action name
   */
  performAction(actionName) {
    switch (actionName) {
      case 'InsertColAfter':
        return this._table.insertColumnAfter();
      case 'InsertRowAfter':
        return this._table.insertRowAfter();
    }
  }

  /**
   * render actions toolbar
   * @returns {HTMLDivElement}
   */
  renderSettings() {
    const wrapper = document.createElement('div');

    this.actions.forEach(({ actionName, icon }) => {
      const button = document.createElement('div');

      button.classList.add('ce-settings__button');
      button.innerHTML = icon;
      button.title = actionName;
      button.addEventListener('click', this.performAction.bind(this, actionName));
      wrapper.appendChild(button);
    });

    return wrapper;
  }

  /**
   * Return Tool's view
   * @returns {HTMLDivElement}
   * @public
   */
  render() {
    return this._table.htmlContainer;
  }

  /**
   * Extract Tool's data from the view
   * @returns {TableData} - saved data
   * @public
   */
  save(toolsContent) {
    const data = this._table.getData();
    return {
      content: data
    };
  }
}

module.exports = Table;
