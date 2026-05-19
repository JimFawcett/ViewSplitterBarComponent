const VSB_STYLE = /* css */ `
  :host { display: inline-flex; flex-direction: column; }

  .container {
    display: flex;
    flex-direction: row;
    border: 2px solid var(--dark, #333);
    box-shadow: 5px 5px 5px #999;
    box-sizing: border-box;
    overflow: hidden;
  }

  .panel {
    display: flex;
    flex-direction: column;
    overflow-x: var(--panel-overflow-x, auto);
    overflow-y: auto;
    box-sizing: border-box;
    background-color: var(--panel-bg, #f8f8f8);
    color: var(--panel-fg, #333);
    cursor: pointer;
    user-select: none;
  }

  .panel-left  { flex: none; }
  .panel-right { flex: 1; min-width: 0; }

  .splitter {
    flex: none;
    width: var(--bar-width, 6px);
    background-color: var(--bar-color, #888);
    cursor: col-resize;
    user-select: none;
  }

  .splitter:hover { filter: brightness(0.75); }

  .resizer {
    flex: none;
    height: var(--bar-width, 6px);
    background-color: var(--bar-color, #888);
    cursor: ns-resize;
    user-select: none;
  }

  .resizer:hover { filter: brightness(0.75); }

  ::slotted(pre) {
    flex: 1;
    min-height: 0;
    margin: 0 !important;
    padding: var(--panel-padding, 0.75rem 1rem);
    line-height: 1.4;
    white-space: pre;
    box-sizing: border-box;
    background: transparent;
    color: inherit;
    font-family: Consolas, 'Courier New', monospace;
    font-size: 0.9rem;
  }
`;

const VSB_TEMPLATE = /* html */ `
  <style>${VSB_STYLE}</style>
  <div class="container" part="container">
    <div class="panel panel-left" part="panel-left">
      <slot name="left"></slot>
    </div>
    <div class="splitter" part="splitter"></div>
    <div class="panel panel-right" part="panel-right">
      <slot name="right"></slot>
    </div>
  </div>
  <div class="resizer" part="resizer"></div>
`;

class ViewSplitterBar extends HTMLElement {
  static get observedAttributes() {
    return [
      'width', 'height', 'left-ratio', 'bar-width', 'bar-color',
      'bg-color', 'color', 'overflow-x', 'code-padding',
      'highlight', 'step-px', 'min-panel-px', 'min-height-px'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = VSB_TEMPLATE;

    this._els = {
      container:  this.shadowRoot.querySelector('.container'),
      panelLeft:  this.shadowRoot.querySelector('.panel-left'),
      splitter:   this.shadowRoot.querySelector('.splitter'),
      panelRight: this.shadowRoot.querySelector('.panel-right'),
      resizer:    this.shadowRoot.querySelector('.resizer'),
      slotLeft:   this.shadowRoot.querySelector('slot[name="left"]'),
      slotRight:  this.shadowRoot.querySelector('slot[name="right"]'),
    };

    this._leftPx     = null;
    this._heightPx   = null;
    this._dragStartX = 0;
    this._dragStartW = 0;
    this._dragStartY = 0;
    this._dragStartH = 0;

    this._onMousedown       = e  => this._startDrag(e);
    this._onMousemove       = e  => this._onDrag(e);
    this._onMouseup         = () => this._endDrag();
    this._onResizerMousedown = e  => this._startHeightDrag(e);
    this._onResizerMousemove = e  => this._onHeightDrag(e);
    this._onResizerMouseup   = () => this._endHeightDrag();
    this._onClickLeft       = () => this._bump(+1);
    this._onClickRight      = () => this._bump(-1);
    this._onSlotChange      = () => { this._maybePrism(); this._harmonizeSlotted(); };
  }

  connectedCallback() {
    this._applyStyles();
    this._applyLayout();
    this._maybePrism();
    this._harmonizeSlotted();
    this._els.splitter.addEventListener('mousedown',  this._onMousedown);
    this._els.resizer.addEventListener('mousedown',   this._onResizerMousedown);
    this._els.panelLeft.addEventListener('click',     this._onClickLeft);
    this._els.panelRight.addEventListener('click',    this._onClickRight);
    this._els.slotLeft.addEventListener('slotchange', this._onSlotChange);
    this._els.slotRight.addEventListener('slotchange', this._onSlotChange);
  }

  disconnectedCallback() {
    this._els.splitter.removeEventListener('mousedown',  this._onMousedown);
    this._els.resizer.removeEventListener('mousedown',   this._onResizerMousedown);
    this._els.panelLeft.removeEventListener('click',     this._onClickLeft);
    this._els.panelRight.removeEventListener('click',    this._onClickRight);
    this._els.slotLeft.removeEventListener('slotchange', this._onSlotChange);
    this._els.slotRight.removeEventListener('slotchange', this._onSlotChange);
    document.removeEventListener('mousemove', this._onMousemove);
    document.removeEventListener('mouseup',   this._onMouseup);
    document.removeEventListener('mousemove', this._onResizerMousemove);
    document.removeEventListener('mouseup',   this._onResizerMouseup);
  }

  attributeChangedCallback() {
    this._leftPx   = null;
    this._heightPx = null;
    this._applyStyles();
    this._applyLayout();
  }

  // --- horizontal splitter drag ---

  _startDrag(e) {
    e.preventDefault();
    this._dragStartX = e.clientX;
    this._dragStartW = this._getLeftPx();
    document.addEventListener('mousemove', this._onMousemove);
    document.addEventListener('mouseup',   this._onMouseup);
  }

  _onDrag(e) {
    this._setLeftPx(this._dragStartW + (e.clientX - this._dragStartX));
  }

  _endDrag() {
    document.removeEventListener('mousemove', this._onMousemove);
    document.removeEventListener('mouseup',   this._onMouseup);
  }

  // --- bottom resizer drag ---

  _startHeightDrag(e) {
    e.preventDefault();
    this._dragStartY = e.clientY;
    this._dragStartH = this._getHeightPx();
    document.addEventListener('mousemove', this._onResizerMousemove);
    document.addEventListener('mouseup',   this._onResizerMouseup);
  }

  _onHeightDrag(e) {
    this._setHeightPx(this._dragStartH + (e.clientY - this._dragStartY));
  }

  _endHeightDrag() {
    document.removeEventListener('mousemove', this._onResizerMousemove);
    document.removeEventListener('mouseup',   this._onResizerMouseup);
  }

  // --- panel width helpers ---

  _bump(dir) {
    const step = parseFloat(this.getAttribute('step-px')) || 40;
    this._setLeftPx(this._getLeftPx() + dir * step);
  }

  _getLeftPx() {
    if (this._leftPx != null) return this._leftPx;
    const ratio     = parseFloat(this.getAttribute('left-ratio')) || 0.5;
    const available = this._availableWidth();
    this._leftPx    = Math.round(ratio * available);
    return this._leftPx;
  }

  _setLeftPx(px) {
    const minPx     = parseFloat(this.getAttribute('min-panel-px')) || 120;
    const available = this._availableWidth();
    this._leftPx    = Math.min(Math.max(Math.round(px), minPx), available - minPx);
    this._els.panelLeft.style.width = `${this._leftPx}px`;
  }

  _availableWidth() {
    return Math.max(this._totalWidthPx() - this._barWidthPx(), 1);
  }

  _barWidthPx() {
    return parseFloat(this.getAttribute('bar-width') || '6') || 6;
  }

  _totalWidthPx() {
    const w = this.getAttribute('width');
    if (w) {
      if (w.endsWith('rem')) {
        const rootFs = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        return parseFloat(w) * rootFs;
      }
      return parseFloat(w) || 600;
    }
    const r = this._els.container.getBoundingClientRect();
    return r.width > 0 ? r.width : 600;
  }

  // --- container height helpers ---

  _getHeightPx() {
    if (this._heightPx != null) return this._heightPx;
    const h = this.getAttribute('height');
    if (h) {
      if (h.endsWith('rem')) {
        const rootFs = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        this._heightPx = parseFloat(h) * rootFs;
      } else {
        this._heightPx = parseFloat(h) || 200;
      }
    } else {
      const r = this._els.container.getBoundingClientRect();
      this._heightPx = r.height > 0 ? r.height : 200;
    }
    return this._heightPx;
  }

  _setHeightPx(px) {
    const minPx    = parseFloat(this.getAttribute('min-height-px')) || 80;
    this._heightPx = Math.max(Math.round(px), minPx);
    this._els.container.style.height = `${this._heightPx}px`;
  }

  // --- apply ---

  _applyStyles() {
    const bg  = this.getAttribute('bg-color')     || 'var(--light, #f8f8f8)';
    const fg  = this.getAttribute('color')        || 'var(--dark, #333)';
    const pad = this.getAttribute('code-padding') || '0.75rem 1rem';
    const ox  = this.getAttribute('overflow-x')   || 'auto';
    const bw  = this.getAttribute('bar-width')    || '6px';
    const bc  = this.getAttribute('bar-color')    || '#888';
    this.style.setProperty('--panel-bg',         bg);
    this.style.setProperty('--panel-fg',         fg);
    this.style.setProperty('--panel-padding',    pad);
    this.style.setProperty('--panel-overflow-x', ox);
    this.style.setProperty('--bar-width',        bw);
    this.style.setProperty('--bar-color',        bc);
  }

  _applyLayout() {
    const w = this.getAttribute('width');
    if (w) this._els.container.style.width = w;
    if (this.getAttribute('height') || this._heightPx != null) {
      this._els.container.style.height = `${this._getHeightPx()}px`;
    }
    this._els.panelLeft.style.width = `${this._getLeftPx()}px`;
  }

  _maybePrism() {
    if (this.getAttribute('highlight') !== 'prism' || !window.Prism) return;
    [this._els.slotLeft, this._els.slotRight].forEach(slot => {
      slot.assignedElements({ flatten: true }).forEach(el => {
        const codes = el.tagName === 'CODE' ? [el] : [...el.querySelectorAll('code')];
        codes.forEach(c => window.Prism.highlightElement(c));
      });
    });
  }

  _harmonizeSlotted() {
    const pad = this.getAttribute('code-padding') || '0.75rem 1rem';
    [this._els.slotLeft, this._els.slotRight].forEach(slot => {
      slot.assignedElements({ flatten: true }).forEach(el => {
        if (el.tagName !== 'PRE') return;
        el.style.margin    = '0';
        el.style.padding   = pad;
        el.style.flex      = '1';
        el.style.minHeight = '0';
        el.style.boxSizing = 'border-box';
      });
    });
  }
}

customElements.define('view-splitter-bar', ViewSplitterBar);
