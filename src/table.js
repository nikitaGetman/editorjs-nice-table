import { create } from './documentUtils';
import './styles/table.pcss';

const CSS = {
  table: 'tc-table',
  topBorder: 'tc-table__top-border',
  leftBorder: 'tc-table__left-border',
  inputField: 'tc-table__inp',
  cell: 'tc-table__cell',
  wrapper: 'tc-table__wrap',
  area: 'tc-table__area',
  highlight: 'tc-table__highlight',
  firstCell: 'tc-table__first-cell'
};

/**
 * Generates and manages _table contents.
 */
export class Table {
  /**
   * Creates
   */
  constructor() {
    this._numberOfColumns = 0;
    this._numberOfRows = 0;
    this._element = this._createTableWrapper();
    this._table = this._element.querySelector('table');

    this._isSelectingCells = false;
    this._selectedCells = [];
    this._selectedCellFrom = null;
    this._selectedCellTo = null;

    this._isCellFocused = false;

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
    let position = 0;

    if (this.firstSelectedCell) {
      const x = this._whichChild(this.firstSelectedCell);
      position = Math.max(x + direction, 0);
    }

    this._numberOfColumns++;
    /** Add cell in each row */
    const rows = this._table.rows;
    for (let i = 0; i < rows.length; i++) {
      const cell = rows[i].insertCell(position);
      this._fillCell(cell);
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
    let position = 0;

    if (this.firstSelectedCell) {
      const y = this._whichChild(this.firstSelectedCell.parentNode);
      position = Math.max(y + direction, 0);
    }

    const row = this._table.insertRow(position);
    this._numberOfRows++;
    this._fillRow(row);
    return row;
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
      this._moveFocus(event);
    });

    this._table.addEventListener('click', event => {
      this._handleBorderClick(event);
    });

    this._table.addEventListener('mousedown', event => {
      if (event.shiftKey) {
        this._selectCellsByShift(event);
      } else if (event.ctrlKey || event.metaKey) {
        this._selectCellsByCtrl(event);
      } else {
        this._mousedownOnCell(event);
      }
    });

    this._table.addEventListener('mouseup', event => {
      this._stopSelecting(event);
    });

    this._table.addEventListener('mousemove', event => {
      this._handleMouseMove(event);
    });
  }

  _startSelecting(event) {
    this._isSelectingCells = true;
    this.firstSelectedCell = event.target.tagName === 'TD' ? event.target : event.target.closest('td');
    this._selectedCellTo = this.firstSelectedCell;
    this._selectCells();
  }

  _stopSelecting() {
    this._isSelectingCells = false;
  }

  _handleMouseMove(event) {
    if (this._isSelectingCells && event.buttons === 1) {
      const cellTo = event.target.tagName === 'TD' ? event.target : event.target.closest('td');

      if (this._selectedCellTo !== cellTo) {
        this._selectedCellTo = cellTo;
        this._selectCells();
      }
    } else {
      this._isSelectingCells = false;
    }
  }

  _selectCells() {
    if (!this.firstSelectedCell || !this._selectedCellTo) {
      this._resetSelecting();
      return;
    }

    const fromCellPos = {
      x: this._whichChild(this.firstSelectedCell),
      y: this._whichChild(this.firstSelectedCell.parentNode)
    };
    const toCellPos = {
      x: this._whichChild(this._selectedCellTo),
      y: this._whichChild(this._selectedCellTo.parentNode)
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

    this._selectedCellTo = cellTo;
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

  _whichChild(elem) {
    if (!elem) return undefined;
    let i = 0;
    while ((elem = elem.previousSibling) != null) ++i;
    return i;
  }

  _resetSelecting() {
    this.firstSelectedCell = null;
    this._selectedCellTo = null;
    this.selectedCells = [];
    this._isSelectingCells = false;
  }

  _handleBorderClick(event) {
    const border = event.target;

    if (border.classList.contains(CSS.topBorder)) {
      this._resetSelecting();

      let position = event.layerX;
      let columnIndex = 0;
      const row = this._table.rows[0];
      for (let cell of row.cells) {
        position -= cell.offsetWidth;
        if (position <= 0) {
          this.firstSelectedCell = cell;
          break;
        }
        columnIndex++;
      }

      const lastRow = this._table.rows[this._numberOfRows - 1];
      const lastCell = lastRow.cells[columnIndex];
      this._selectedCellTo = lastCell;

      this._selectCells();
    }
    if (border.classList.contains(CSS.leftBorder)) {
      this._resetSelecting();

      let position = event.layerY;
      let rowIndex = 0;
      for (let row of this._table.rows) {
        const cell = row.cells[0];
        position -= cell.offsetHeight;
        if (position <= 0) {
          this.firstSelectedCell = cell;
          break;
        }
        rowIndex++;
      }

      const row = this._table.rows[rowIndex];
      const lastCell = row.cells[row.cells.length - 1];
      this._selectedCellTo = lastCell;

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

  _moveFocus(event) {
    if (!this.firstSelectedCell) {
      return;
    }
    if (!this._selectedCellTo) {
      this._selectedCellTo = this.firstSelectedCell;
    }

    if (!this._isCellFocused) {
      if (event.key === 'Enter') {
        event.stopPropagation();
        event.preventDefault();
        this._focusCell();
      }
      if (event.shiftKey) {
        const fromPos = {
          x: this._whichChild(this._selectedCellTo),
          y: this._whichChild(this._selectedCellTo.parentNode)
        };
        let toPos = { ...fromPos };

        if (event.ctrlKey || event.metaKey) {
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            event.stopPropagation();
            toPos.x = this._numberOfColumns - 1;
          }
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            event.stopPropagation();
            toPos.x = 0;
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            event.stopPropagation();
            toPos.y = 0;
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            event.stopPropagation();
            toPos.y = this._numberOfRows - 1;
          }

          const row = this._table.querySelectorAll('tr')[toPos.y];
          const cell = row.querySelectorAll('td')[toPos.x];

          this._selectedCellTo = cell;
          this._selectCells();
        } else {
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            event.stopPropagation();
            toPos.x = Math.min(this._numberOfColumns - 1, toPos.x + 1);
          }
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            event.stopPropagation();
            toPos.x = Math.max(0, toPos.x - 1);
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            event.stopPropagation();
            toPos.y = Math.max(0, toPos.y - 1);
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            event.stopPropagation();
            toPos.y = Math.min(this._numberOfRows - 1, toPos.y + 1);
          }

          const row = this._table.querySelectorAll('tr')[toPos.y];
          const cell = row.querySelectorAll('td')[toPos.x];

          this._selectedCellTo = cell;
          this._selectCells();
        }
      } else {
        const fromPos = {
          x: this._whichChild(this.firstSelectedCell),
          y: this._whichChild(this.firstSelectedCell.parentNode)
        };
        let toPos = { ...fromPos };

        if (event.key === 'ArrowRight') {
          event.preventDefault();
          event.stopPropagation();
          toPos.x = Math.min(this._numberOfColumns - 1, toPos.x + 1);
        }
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          event.stopPropagation();
          toPos.x = Math.max(0, toPos.x - 1);
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          event.stopPropagation();
          toPos.y = Math.max(0, toPos.y - 1);
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          event.stopPropagation();
          toPos.y = Math.min(this._numberOfRows - 1, toPos.y + 1);
        }

        const row = this._table.querySelectorAll('tr')[toPos.y];
        const cell = row.querySelectorAll('td')[toPos.x];

        this.firstSelectedCell = cell;
        this._selectedCellTo = this.firstSelectedCell;
        this._selectCells();
      }
    } else if (event.key === 'Escape') {
      event.stopPropagation();
      event.preventDefault();
      this._unfocusCell();
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
}
