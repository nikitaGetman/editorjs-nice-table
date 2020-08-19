import { create } from './documentUtils';

import ClearCells from './img/formatClear.svg';
import AlignLeft from './img/formatAlignLeft.svg';
import AlignCenter from './img/formatAlignCenter.svg';
import AlignRight from './img/formatAlignRight.svg';
import InsertColBefore from './img/insertColBefore.svg';
import InsertColAfter from './img/insertColAfter.svg';
import InsertRowBefore from './img/insertRowBefore.svg';
import InsertRowAfter from './img/insertRowAfter.svg';
import DeleteRow from './img/deleteRow.svg';
import DeleteCol from './img/deleteCol.svg';

const ICONS = {
  clearCells: ClearCells,
  alignLeft: AlignLeft,
  alignCenter: AlignCenter,
  alignRight: AlignRight,

  insertColBefore: InsertColBefore,
  insertColAfter: InsertColAfter,
  insertRowBefore: InsertRowBefore,
  insertRowAfter: InsertRowAfter,
  deleteRow: DeleteRow,
  deleteCol: DeleteCol
};

const CSS = {
  wrapper: 'tc-table-tools__wrapper',
  visible: 'tc-table-tools__wrapper--visible',
  button: 'tc-table-tools__button',
  icon: 'tc-table-tools__icon'
};

export class TableTools {
  static getWrapperClass() {
    return CSS.wrapper;
  }

  constructor(buttons, table, lastCell, position) {
    this._buttons = buttons;
    this._table = table;
    this._position = position;

    const buttonElements = this._createButtons(this._buttons);
    this._element = this._createToolsWrapper(buttonElements);
    this._table.body.appendChild(this._element);
    this._placeTools(lastCell, this._position);

    setTimeout(() => {
      this._showTools();
    }, 700);
  }

  get toolbarElement() {
    return this._element;
  }

  _createToolsWrapper(buttonElements) {
    return create('div', [CSS.wrapper], null, [...buttonElements]);
  }

  _createButtons(buttons) {
    let elements = [];
    for (const button of buttons) {
      const el = create('button', [CSS.button], { type: 'button' }, [create('div', [CSS.icon], { title: button })]);
      el.querySelector('.' + CSS.icon).innerHTML = ICONS[button];
      el.addEventListener('click', () => {
        this._callAction(button);
      });
      elements.push(el);
    }
    return elements;
  }

  _placeTools(cell, position) {
    const cellCenter = {
      x: cell.offsetLeft + cell.offsetWidth / 2 - 100,
      y: cell.offsetTop + cell.offsetHeight / 2
    };

    const offset = { x: 0, y: 0 };
    if (position === 'top') offset.y = -cell.offsetHeight - 70;
    if (position === 'bottom') offset.y = cell.offsetHeight / 2 + 10;

    this._element.style = `top: ${cellCenter.y + offset.y}px; left: ${cellCenter.x + offset.x}px`;
  }

  _showTools() {
    this._element.classList.add(CSS.visible);
  }

  _callAction(action) {
    switch (action) {
      case 'insertColBefore':
        return this._table.insertColumnBefore();
      case 'insertColAfter':
        return this._table.insertColumnAfter();
      case 'insertRowBefore':
        return this._table.insertRowBefore();
      case 'insertRowAfter':
        return this._table.insertRowAfter();
      case 'deleteRow':
        return this._table.deleteRow();
      case 'deleteCol':
        return this._table.deleteColumn();
      case 'clearCells':
        return this._table.clearCells();
      case 'alignLeft':
        return this._table.toggleCellAlignment('left');
      case 'alignCenter':
        return this._table.toggleCellAlignment('center');
      case 'alignRight':
        return this._table.toggleCellAlignment('right');
    }
  }
}
