import {
  Component,
  RENDER,
  STATE,
  STATE_RENDERED,
  ARG_COMPONENTS
} from 'jinge/src/core/component';
import {
  addEvent,
  removeEvent,
  setAttribute,
  addClass,
  removeClass
} from 'jinge/src/dom';
import {
  Symbol,
  instanceOf,
  STR_DEFAULT,
  isObject
} from 'jinge/src/util';
import {
  UIROUTER_CONTEXT,
  UIROUTER_CONTEXT_PARENT,
  UIROUTER,
  BaseRouter
} from '../core';

export const UISREF_CLICK_HANDLER = Symbol();
export const UISREF_HTML_DOM_NODE = Symbol();
export const UISREF_ON_CLICK = Symbol();
export const UISREF_UPDATE_HREF = Symbol();
export const UISREF_UPDATE_ACTIVE = Symbol();
export const UISREF_DEREGISTER = Symbol();

export class UISref extends Component {
  static get template() {
    return '<a>${text}</a>';
  }
  constructor(attrs) {
    if (attrs.params && !isObject(attrs.params)) {
      throw new Error('<ui-sref> attribute "params" require object.');
    }
    super(attrs);
    const router = this.getContext(UIROUTER_CONTEXT);
    if (!router || !instanceOf(router, BaseRouter)) {
      throw new Error('RouterSref must under parent which has context named Router.CONTEXT_NAME');
    }
    this[UISREF_HTML_DOM_NODE] = null;
    this[UIROUTER] = router;
    this[UISREF_CLICK_HANDLER] = this[UISREF_ON_CLICK].bind(this);
    this.to = attrs.to;
    this.params = attrs.params;
    this.active = attrs.active;
    this.text = attrs.text;
  }
  get to() {
    return this._to;
  }
  set to(v) {
    if (this._to === v) return;
    this._to = v;
    this[STATE] === STATE_RENDERED && this[UISREF_UPDATE_HREF]();
  }
  get params() {
    return this._p;
  }
  set params(v) {
    this._p = v;
    this[STATE] === STATE_RENDERED && this[UISREF_UPDATE_HREF]();
  }
  get active() {
    return this._a;
  }
  set active(v) {
    if (this._a === v) return;
    const oldV = this._a;
    this._a = v;
    if (this[STATE] === STATE_RENDERED) {
      if (oldV) removeClass(this[UISREF_HTML_DOM_NODE], oldV);
      this[UISREF_UPDATE_ACTIVE]();
    }
  }
  [UISREF_ON_CLICK](e) {
    if (!this.to) return;
    if (!e.defaultPrevented && !(e.button == 1 || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      this[UIROUTER].go(this.to, this.params);
    }
  }
  afterRender() {
    this[UISREF_DEREGISTER] = this[UIROUTER].transitionService.onSuccess({}, () => this[UISREF_UPDATE_ACTIVE]());
    addEvent(this[UISREF_HTML_DOM_NODE], 'click', this[UISREF_CLICK_HANDLER]);
  }
  beforeDestroy() {
    removeEvent(this[UISREF_HTML_DOM_NODE], 'click', this[UISREF_CLICK_HANDLER]);
    this[UISREF_DEREGISTER]();
  }
  [RENDER]() {
    let renderFn = this[ARG_COMPONENTS] ? this[ARG_COMPONENTS][STR_DEFAULT] : null;
    if (!renderFn) {
      renderFn = this.constructor.template;
    }
    const renderResults = renderFn(this);
    if (renderResults.length !== 1) {
      throw new Error('render results of <ui-sref> must be only one html element');
    }
    this[UISREF_HTML_DOM_NODE] = renderResults[0];
    this[UISREF_UPDATE_HREF]();
    this[UISREF_UPDATE_ACTIVE]();
    return renderResults;
  }
  [UISREF_UPDATE_HREF]() {
    const el = this[UISREF_HTML_DOM_NODE];
    if (el.tagName === 'A') {
      const parent = this.getContext(UIROUTER_CONTEXT_PARENT);
      const parentContext = (parent && parent.context) || this[UIROUTER].stateRegistry.root();
      const href = this[UIROUTER].href(this.to, this.params, {
        relative: parentContext,
        inherit: true
      });
      //  console.log(parentContext)
      // console.log(this.to, this.params, href);
      setAttribute(el, 'href', href);
    }
  }
  [UISREF_UPDATE_ACTIVE]() {
    if (!this.active) return;
    const el = this[UISREF_HTML_DOM_NODE];
    if (!el) return;
    // console.log(this.to, this.params);
    if (this[UIROUTER].includes(this.to, this.params)) {
      addClass(el, this.active);
    } else {
      removeClass(el, this.active);
    }
  }
}