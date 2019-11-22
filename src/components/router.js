import {
  Component,
  SET_CONTEXT,
  Symbol,
  AFTER_RENDER,
  BEFORE_DESTROY
} from 'jinge';
import {
  UIROUTER_CONTEXT,
  UIROUTER,
  HashRouter as HashCoreRouter,
  Html5Router as Html5CoreRouter
} from '../core';

export const UI_ROUTER = Symbol('router');

export class UIBaseRouter extends Component {
  constructor(attrs, CoreRouter) {
    const router = attrs.router || new CoreRouter();
    if (attrs.plugins) {
      attrs.plugins.forEach(plugin => router.plugin(plugin));
    }
    if (attrs.states) {
      attrs.states.forEach(state => router.register(state));
    }
    if (attrs.otherwise) {
      router.otherwise(attrs.otherwise);
    }
    super(attrs);
    this[UIROUTER] = router;
    this[SET_CONTEXT](UIROUTER_CONTEXT, router);

    this.baseHref = attrs.baseHref;
  }

  get baseHref() {
    return this[UIROUTER].baseHref;
  }

  set baseHref(v) {
    this[UIROUTER].baseHref = v;
  }

  [AFTER_RENDER]() {
    this[UIROUTER].start();
  }

  [BEFORE_DESTROY]() {
    this[UIROUTER].dispose();
  }
}

export class UIHashRouter extends UIBaseRouter {
  constructor(attrs) {
    super(attrs, HashCoreRouter);
  }
}

export class UIHtml5Router extends UIBaseRouter {
  constructor(attrs) {
    super(attrs, Html5CoreRouter);
  }
}
