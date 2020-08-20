import { create, whichChild } from './documentUtils';
import './styles/table.pcss';
import { TableTools } from './tableTools';

const CSS = {
  editor: 'tc-editor',
  table: 'tc-table',
  topBorder: 'tc-table__top-border',
  leftBorder: 'tc-table__left-border',
  inputField: 'tc-table__inp',
  cell: 'tc-table__cell',
  wrapper: 'tc-table__wrap',
  area: 'tc-table__area',
  highlight: 'tc-table__highlight',
  firstCell: 'tc-table__first-cell',
  alignLeft: 'tc-table__align-left',
  alignCenter: 'tc-table__align-center',
  alignRight: 'tc-table__align-right'
};

/**
 * Generates and manages _table contents.
 */
export class TableCore {
  /**
   * Creates
   */
  constructor(data, config, api) {
    this.api = api;
    this._numberOfColumns = 0;
    this._numberOfRows = 0;
    this._element = this._createTableWrapper();
    this._table = this._element.querySelector('table');

    this._isSelectingCellsByBorder = false;
    this._isSelectingCells = false;
    this._selectedCells = [];
    this._selectedCellFrom = null;
    this._selectedCellTo = null;

    this._tableToolbar = null;

    this._isCellFocused = false;
    this._isFocusChanged = false;

    this._resizeTable(data, config);
    this._fillTable(data);
    this._container = create('div', [CSS.editor, api.styles && api.styles.block], null, [this.htmlElement]);

    this._attachEvents();
  }

  /**
   * returns selected/editable cell or null if row is not selected
   * @return {HTMLElement|null}
   */
  get firstSelectedCell() {
    return this._selectedCellFrom;
  }

  /**
   * sets a selected cell and highlights it
   * @param cell - new current cell
   */
  set firstSelectedCell(cell) {
    if (this._selectedCellFrom) {
      this._selectedCellFrom.classList.remove(CSS.firstCell);
    }
    this._selectedCellFrom = cell;
    if (this._selectedCellFrom) {
      this._selectedCellFrom.classList.add(CSS.firstCell);
    }
  }

  get lastSelectedCell() {
    return this._selectedCellTo;
  }
  set lastSelectedCell(cell) {
    if (this._tableToolbar) {
      this._table.removeChild(this._tableToolbar);
      this._tableToolbar = null;
    }
    this._selectedCellTo = cell;
    if (this._selectedCellTo) {
      const startPos = whichChild(this.firstSelectedCell.parentNode);
      const endPos = whichChild(this._selectedCellTo.parentNode);

      const position = startPos <= endPos ? 'bottom' : 'top';
      const buttons = [
        'clearCells',
        'alignLeft',
        'alignCenter',
        'alignRight',
        'insertColBefore',
        'insertColAfter',
        'insertRowBefore',
        'insertRowAfter',
        'deleteRow',
        'deleteCol'
      ];

      const toolbar = new TableTools([...buttons], this, this._selectedCellTo, position);
      this._tableToolbar = toolbar.toolbarElement;
    }
  }

  get selectedCells() {
    return this._selectedCells || [];
  }
  set selectedCells(cells) {
    const cellsToUnselect = this._selectedCells.filter(cell => !cells.includes(cell));
    const cellsToSelect = cells.filter(cell => !this._selectedCells.includes(cell));
    this._unhighlightCells(cellsToUnselect);
    this._highlightCells(cellsToSelect);
    this._selectedCells = cells;
  }

  get selectedRows() {
    const rows = new Set();

    if (this.selectedCells.length) {
      this.selectedCells.forEach(cell => rows.add(cell.closest('tr')));
    }

    return Array.from(rows);
  }

  get selectedColumns() {
    const cols = new Set();

    if (this.selectedCells.length) {
      this.selectedCells.forEach(cell => {
        const firstRow = this._table.rows[0];
        cols.add(firstRow.cells[cell.cellIndex]);
      });
    }

    return Array.from(cols);
  }

  /**
   * @private
   *
   * resize to match config or transmitted data
   * @param {TableData} data - data for inserting to the table
   * @param {object} config - configuration of table
   * @param {number|string} config.rows - number of rows in configuration
   * @param {number|string} config.cols - number of cols in configuration
   * @return {{rows: number, cols: number}} - number of cols and rows
   */
  _resizeTable(data, config) {
    const isValidArray = Array.isArray(data.content);
    const isNotEmptyArray = isValidArray ? data.content.length : false;
    const contentRows = isValidArray ? data.content.length : undefined;
    const contentCols = isNotEmptyArray ? data.content[0].length : undefined;
    const parsedRows = Number.parseInt(config.rows);
    const parsedCols = Number.parseInt(config.cols);
    // value of config have to be positive number
    const configRows = !isNaN(parsedRows) && parsedRows > 0 ? parsedRows : undefined;
    const configCols = !isNaN(parsedCols) && parsedCols > 0 ? parsedCols : undefined;
    const defaultRows = 2;
    const defaultCols = 2;
    const rows = contentRows || configRows || defaultRows;
    const cols = contentCols || configCols || defaultCols;

    for (let i = 0; i < rows; i++) {
      this.insertRow();
    }
    for (let i = 0; i < cols; i++) {
      this.insertColumn();
    }

    return {
      rows: rows,
      cols: cols
    };
  }

  /**
   * @private
   *
   *  Fill table data passed to the constructor
   * @param {TableData} data - data for insert in table
   */
  _fillTable(data) {
    if (data.content !== undefined) {
      for (let i = 0; i < this._numberOfRows && i < data.content.length; i++) {
        for (let j = 0; j < this._numberOfColumns && j < data.content[i].length; j++) {
          // get current cell and her editable part
          const input = this._table.rows[i].cells[j].querySelector('.' + CSS.inputField);

          const regex = /(\#\{(?<prefix>[\w;=]*)\})?(?<value>[\w\W.]*)/;
          const content = data.content[i][j];
          const parsed = regex.exec(content);

          const prefix = parsed.groups.prefix;

          if (prefix) {
            const rules = prefix.split(';').filter(r => r);
            for (const rule of rules) {
              const [key, value] = rule.split('=');
              if (key === 'align') {
                this._setInputAlignment(input, value);
              }
            }
          }
          input.innerHTML = parsed.groups.value;
        }
      }
    }
  }

  /**
   * Inserts column to the right from currently selected cell
   */
  insertColumnAfter() {
    this.insertColumn(1);
  }

  /**
   * Inserts column to the left from currently selected cell
   */
  insertColumnBefore() {
    this.insertColumn();
  }

  /**
   * Inserts new row below a current row
   */
  insertRowBefore() {
    this.insertRow();
  }

  /**
   * Inserts row above a current row
   */
  insertRowAfter() {
    this.insertRow(1);
  }

  /**
   * Insert a column into table relatively to a current cell
   * @param {number} direction - direction of insertion. 0 is insertion before, 1 is insertion after
   */
  insertColumn(direction = 0) {
    let position = direction * this._numberOfColumns;

    if (this.firstSelectedCell && this.lastSelectedCell) {
      const fromY = whichChild(this.firstSelectedCell);
      const toY = whichChild(this.lastSelectedCell);
      const end = fromY > toY ? fromY : toY;
      const start = fromY < toY ? fromY : toY;
      position = direction ? end + 1 : start;
    }

    const amount = this.selectedColumns.length || 1;

    for (let i = 0; i < amount; i++) {
      /** Add cell in each row */
      const rows = this._table.rows;
      for (let j = 0; j < rows.length; j++) {
        const cell = rows[j].insertCell(position);
        this._fillCell(cell);
      }
      this._numberOfColumns++;
    }
  }

  /**
   * Remove columns that includes currently selected cells
   * Do nothing if there's no current cells
   */
  deleteColumn() {
    if (!this.selectedColumns.length) return;

    this.selectedColumns.forEach(col => {
      const index = col.cellIndex;
      const rows = this._table.rows;
      /** Delete cell in each row */
      for (let i = 0; i < rows.length; i++) {
        rows[i].deleteCell(index);
      }

      this._numberOfColumns--;
    });
    this._resetSelecting();
  }

  /**
   * Insert a row into table relatively to a current cell
   * @param {number} direction - direction of insertion. 0 is insertion before, 1 is insertion after
   * @return {HTMLElement} row
   */
  insertRow(direction = 0) {
    let position = direction * this._numberOfRows;

    if (this.firstSelectedCell && this.lastSelectedCell) {
      const fromY = whichChild(this.firstSelectedCell.parentNode);
      const toY = whichChild(this.lastSelectedCell.parentNode);
      const end = fromY > toY ? fromY : toY;
      const start = fromY < toY ? fromY : toY;
      position = direction ? end + 1 : start;
    }

    const amount = this.selectedRows.length || 1;

    for (let i = 0; i < amount; i++) {
      const row = this._table.insertRow(position);
      this._numberOfRows++;
      this._fillRow(row);
    }
  }

  /**
   * Remove selected rows in table
   */
  deleteRow() {
    if (!this.selectedRows.length) return;

    this.selectedRows.forEach(row => {
      this._table.deleteRow(row.rowIndex);
      this._numberOfRows--;
    });
    this._resetSelecting();
  }

  /**
   * get html table wrapper
   * @return {HTMLElement}
   */
  get htmlElement() {
    return this._element;
  }

  get htmlContainer() {
    return this._container;
  }

  /**
   * get real table tag
   * @return {HTMLElement}
   */
  get body() {
    return this._table;
  }

  /**
   * @private
   *
   * Creates table structure
   * @return {HTMLElement} tbody - where rows will be
   */
  _createTableWrapper() {
    return create('div', [CSS.wrapper], null, [
      create('table', [CSS.table], null, [create('div', [CSS.topBorder]), create('div', [CSS.leftBorder])])
    ]);
  }

  /**
   * @private
   *
   * Create editable area of cell
   * @return {HTMLElement} - the area
   */
  _createContenteditableArea() {
    return create('div', [CSS.inputField], {
      contenteditable: 'false',
      tabindex: '0'
    });
  }

  /**
   * @private
   *
   * Fills the empty cell of the editable area
   * @param {HTMLElement} cell - empty cell
   */
  _fillCell(cell) {
    cell.classList.add(CSS.cell);
    const content = this._createContenteditableArea();

    cell.appendChild(create('div', [CSS.area], null, [content]));
  }

  /**
   * @private
   *
   * Fills the empty row with cells  in the size of numberOfColumns
   * @param row = the empty row
   */
  _fillRow(row) {
    for (let i = 0; i < this._numberOfColumns; i++) {
      const cell = row.insertCell();

      this._fillCell(cell);
    }
  }

  /**
   * @private
   *
   * hang necessary events
   */
  _attachEvents() {
    this._table.addEventListener('keydown', event => {
      this._pressedEnterInEditField(event);
      this._selectCellsByKeyboard(event);
    });

    this._table.addEventListener('mousedown', event => {
      // this._isFocusChanged = true;
      this._selectCellsByBorder(event);

      if (event.shiftKey) {
        this._selectCellsByShift(event);
      } else if (event.ctrlKey || event.metaKey) {
        this._selectCellsByCtrl(event);
      } else {
        this._mousedownOnCell(event);
      }
    });

    this._table.addEventListener('click', event => {
      this._clickOnCell(event);
    });

    this._table.addEventListener('mousemove', event => {
      this._selectCellsByBorder(event);
      this._handleMouseMove(event);
    });

    this._table.addEventListener('mouseup', () => {
      this._isSelectingCells = false;
      this._isSelectingCellsByBorder = false;
    });

    this.api.listeners.on(
      this._table,
      'blur',
      event => {
        // console.log('before blur');
        this._isFocusChanged = false;
        setTimeout(() => {
          // console.log('blur', this._isFocusChanged, event.target);
          if (!this._isFocusChanged) {
            // console.log('remove selecting');
            this._resetSelecting();
          }
        }, 0);
      },
      true
    );
    this.api.listeners.on(
      this._table,
      'focus',
      event => {
        // console.log('focus', event.target);
        this._isFocusChanged = true;
      },
      true
    );
  }

  _startSelecting(event) {
    this._isSelectingCells = true;
    this.firstSelectedCell = event.target.tagName === 'TD' ? event.target : event.target.closest('td');
    this.lastSelectedCell = this.firstSelectedCell;
    this._selectCells();
  }

  _handleMouseMove(event) {
    if (this._isSelectingCells && event.buttons === 1) {
      const cellTo = event.target.tagName === 'TD' ? event.target : event.target.closest('td');

      if (this.lastSelectedCell !== cellTo) {
        this.lastSelectedCell = cellTo;
        this._selectCells();
      }
    } else {
      this._isSelectingCells = false;
    }
  }

  _selectCells() {
    if (!this.firstSelectedCell || !this.lastSelectedCell) {
      this._resetSelecting();
      return;
    }

    const fromCellPos = {
      x: whichChild(this.firstSelectedCell),
      y: whichChild(this.firstSelectedCell.parentNode)
    };
    const toCellPos = {
      x: whichChild(this.lastSelectedCell),
      y: whichChild(this.lastSelectedCell.parentNode)
    };

    const from = {
      x: Math.min(fromCellPos.x, toCellPos.x),
      y: Math.min(fromCellPos.y, toCellPos.y)
    };
    const to = {
      x: Math.max(fromCellPos.x, toCellPos.x),
      y: Math.max(fromCellPos.y, toCellPos.y)
    };

    const selectedCells = [];
    const rows = this._table.querySelectorAll('tr');
    for (let i = from.y; i <= to.y; i++) {
      const cells = rows[i].querySelectorAll('td');
      for (let j = from.x; j <= to.x; j++) {
        selectedCells.push(cells[j]);
      }
    }

    this.selectedCells = selectedCells;
  }

  _selectCellsByShift(event) {
    event.preventDefault();

    const cellTo = event.target.tagName === 'TD' ? event.target : event.target.closest('td');

    this.lastSelectedCell = cellTo;
    this._selectCells();
  }

  _selectCellsByCtrl(event) {
    event.preventDefault();

    const cell = event.target.tagName === 'TD' ? event.target : event.target.closest('td');

    if (!this.selectedCells.includes(cell)) {
      this.selectedCells = [...this.selectedCells, cell];
      if (!this.firstSelectedCell) {
        this.firstSelectedCell = cell;
      }
    } else {
      this.selectedCells = this.selectedCells.filter(c => c !== cell);
      if (this.firstSelectedCell === cell) {
        if (this.selectedCells.length) {
          this.firstSelectedCell = this.selectedCells[0];
        } else {
          this._resetSelecting();
        }
      }
    }
  }

  _unhighlightCells(cells) {
    cells.forEach(cell => cell.classList.remove(CSS.highlight));
  }

  _highlightCells(cells) {
    cells.forEach(cell => cell.classList.add(CSS.highlight));
  }

  _resetSelecting() {
    this.firstSelectedCell = null;
    this.lastSelectedCell = null;
    this.selectedCells = [];
    this._isSelectingCells = false;
    this._isFocusChanged = false;
  }

  _selectCellsByBorder(event) {
    if (event.buttons !== 1) {
      this._isSelectingCellsByBorder = false;
      return;
    }

    const border = event.target;

    if (border.classList.contains(CSS.topBorder)) {
      if (!this._isSelectingCellsByBorder) this._resetSelecting();

      let position = event.layerX;
      let columnIndex = 0;
      const row = this._table.rows[0];
      for (let cell of row.cells) {
        position -= cell.offsetWidth;
        if (position <= 0) {
          if (!this._isSelectingCellsByBorder) this.firstSelectedCell = cell;
          break;
        }
        columnIndex++;
      }

      const lastRow = this._table.rows[this._numberOfRows - 1];
      const lastCell = lastRow.cells[columnIndex];
      this.lastSelectedCell = lastCell;
      this._isSelectingCellsByBorder = true;
      this._selectCells();
    }
    if (border.classList.contains(CSS.leftBorder)) {
      if (!this._isSelectingCellsByBorder) this._resetSelecting();

      let position = event.layerY;
      let rowIndex = 0;
      for (let row of this._table.rows) {
        const cell = row.cells[0];
        position -= cell.offsetHeight;
        if (position <= 0) {
          if (!this._isSelectingCellsByBorder) this.firstSelectedCell = cell;
          break;
        }
        rowIndex++;
      }

      const row = this._table.rows[rowIndex];
      const lastCell = row.cells[row.cells.length - 1];
      this.lastSelectedCell = lastCell;
      this._isSelectingCellsByBorder = true;
      this._selectCells();
    }
  }

  /**
   * @private
   *
   * When enter is pressed when editing a field
   * @param {KeyboardEvent} event
   */
  _pressedEnterInEditField(event) {
    if (!event.target.classList.contains(CSS.inputField)) {
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
    }
  }

  _selectCellsByKeyboard(event) {
    if (!this.firstSelectedCell) {
      return;
    }
    if (!this.lastSelectedCell) {
      this.lastSelectedCell = this.firstSelectedCell;
    }

    // if(event.key === )

    let preventAndStop = false;

    if (!this._isCellFocused) {
      if (event.key === 'Enter') {
        preventAndStop = true;
        this._focusCell();
      }
      if (event.shiftKey) {
        const fromPos = {
          x: whichChild(this.lastSelectedCell),
          y: whichChild(this.lastSelectedCell.parentNode)
        };
        let toPos = { ...fromPos };

        if (event.ctrlKey || event.metaKey) {
          if (event.key === 'ArrowRight') {
            preventAndStop = true;
            toPos.x = this._numberOfColumns - 1;
          }
          if (event.key === 'ArrowLeft') {
            preventAndStop = true;
            toPos.x = 0;
          }
          if (event.key === 'ArrowUp') {
            preventAndStop = true;
            toPos.y = 0;
          }
          if (event.key === 'ArrowDown') {
            preventAndStop = true;
            toPos.y = this._numberOfRows - 1;
          }

          if (preventAndStop) {
            const row = this._table.querySelectorAll('tr')[toPos.y];
            const cell = row.querySelectorAll('td')[toPos.x];

            this.lastSelectedCell = cell;
            this._selectCells();
          }
        } else {
          if (event.key === 'ArrowRight') {
            preventAndStop = true;
            toPos.x = Math.min(this._numberOfColumns - 1, toPos.x + 1);
          }
          if (event.key === 'ArrowLeft') {
            preventAndStop = true;
            toPos.x = Math.max(0, toPos.x - 1);
          }
          if (event.key === 'ArrowUp') {
            preventAndStop = true;
            toPos.y = Math.max(0, toPos.y - 1);
          }
          if (event.key === 'ArrowDown') {
            preventAndStop = true;
            toPos.y = Math.min(this._numberOfRows - 1, toPos.y + 1);
          }

          if (preventAndStop) {
            const row = this._table.querySelectorAll('tr')[toPos.y];
            const cell = row.querySelectorAll('td')[toPos.x];

            this.lastSelectedCell = cell;
            this._selectCells();
          }
        }
      } else {
        const fromPos = {
          x: whichChild(this.firstSelectedCell),
          y: whichChild(this.firstSelectedCell.parentNode)
        };
        let toPos = { ...fromPos };

        if (event.key === 'ArrowRight') {
          preventAndStop = true;
          toPos.x = Math.min(this._numberOfColumns - 1, toPos.x + 1);
        }
        if (event.key === 'ArrowLeft') {
          preventAndStop = true;
          toPos.x = Math.max(0, toPos.x - 1);
        }
        if (event.key === 'ArrowUp') {
          preventAndStop = true;
          toPos.y = Math.max(0, toPos.y - 1);
        }
        if (event.key === 'ArrowDown') {
          preventAndStop = true;
          toPos.y = Math.min(this._numberOfRows - 1, toPos.y + 1);
        }

        if (preventAndStop) {
          const row = this._table.querySelectorAll('tr')[toPos.y];
          const cell = row.querySelectorAll('td')[toPos.x];

          this.firstSelectedCell = cell;
          this.lastSelectedCell = this.firstSelectedCell;
          this._selectCells();
        }
      }
    } else if (event.key === 'Escape') {
      preventAndStop = true;
      this._unfocusCell();
    }

    if (preventAndStop) {
      event.stopPropagation();
      event.preventDefault();
    }
  }

  /**
   * @private
   *
   * When clicking on a cell focus or select it if focused
   * @param {MouseEvent} event
   */
  _mousedownOnCell(event) {
    if (event.target.tagName === 'TBODY') return;

    const input = event.target.classList.contains(CSS.inputField)
      ? event.target
      : event.target.querySelector('.' + CSS.inputField);

    if (!input) return;

    const cell = input.closest('td');

    if (cell === this.firstSelectedCell) {
      this._focusCell();
    } else {
      this._unfocusCell();
      this.firstSelectedCell = cell;
    }

    this._startSelecting(event);
  }

  _clickOnCell() {
    const cell = event.target.tagName === 'TD' ? event.target : event.target.closest('td');
    if (cell) {
      this._focusCell();
    }
  }

  _focusCell() {
    const input = this.firstSelectedCell.querySelector('.' + CSS.inputField);
    input.contentEditable = true;
    input.focus();
    this._isCellFocused = true;
  }

  _unfocusCell() {
    if (this.firstSelectedCell) {
      const input = this.firstSelectedCell.querySelector('.' + CSS.inputField);
      input.contentEditable = false;
      this._isCellFocused = false;
    }
  }

  /**
   * @private
   *
   * Check input field is empty
   * @param {HTMLElement} input - input field
   * @return {boolean}
   */
  _isEmpty(input) {
    return !input.textContent.trim();
  }

  _setInputAlignment(input, align) {
    const alignmentMap = {
      left: CSS.alignLeft,
      center: CSS.alignCenter,
      right: CSS.alignRight
    };

    const alignClass = alignmentMap[align];

    if (!alignClass) return;

    // if align by left then remove all alignment
    if (alignClass === alignmentMap.left) {
      input.classList.remove(alignmentMap.center);
      input.classList.remove(alignmentMap.right);
    }
    // toggle classes of other alignment
    // TODO: do this somehow better
    else if (!input.classList.contains(alignClass)) {
      input.classList.add(alignClass);
      if (alignClass === alignmentMap.center) {
        input.classList.remove(alignmentMap.right);
      }
      if (alignClass === alignmentMap.right) {
        input.classList.remove(alignmentMap.center);
      }
    }
  }

  getData() {
    const data = [];
    const rows = this._table.rows;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const inputs = [];
      for (const cell of row.cells) {
        inputs.push(cell.querySelector('.' + CSS.inputField));
      }

      const isWorthlessRow = inputs.every(this._isEmpty);

      if (isWorthlessRow) {
        continue;
      }

      const formattedInputs = inputs.map(input => {
        let prefix = '';
        if (input.classList.contains(CSS.alignCenter)) {
          prefix += 'align=center;';
        } else if (input.classList.contains(CSS.alignRight)) {
          prefix += 'align=right;';
        }
        return `#{${prefix}}${input.innerHTML}`;
      });
      data.push(formattedInputs);
    }

    return data;
  }

  toggleCellAlignment(position) {
    const alignmentMap = {
      left: CSS.alignLeft,
      center: CSS.alignCenter,
      right: CSS.alignRight
    };

    const alignClass = alignmentMap[position];

    if (!alignClass) return;

    const cells = this.selectedCells;

    let isRemoveAlignment = false;
    for (const cell of cells) {
      const input = cell.querySelector('.' + CSS.inputField);
      isRemoveAlignment = input.classList.contains(alignClass);
      if (!isRemoveAlignment) break;
    }

    for (const cell of cells) {
      const input = cell.querySelector('.' + CSS.inputField);
      if (isRemoveAlignment) {
        input.classList.remove(alignClass);
      } else {
        this._setInputAlignment(input, position);
      }
    }
  }

  clearCells() {
    const alignmentClasses = [CSS.alignLeft, CSS.alignCenter, CSS.alignRight];
    const cells = this.selectedCells;

    for (const cell of cells) {
      const input = cell.querySelector('.' + CSS.inputField);
      for (const aClass of alignmentClasses) input.classList.remove(aClass);
      input.innerHtml = '';
      input.innerText = '';
    }
  }
}
