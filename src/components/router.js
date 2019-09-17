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
    const router = new CoreRouter();
    // console.log(attrs._plugins);
    if (attrs && attrs._plugins) {
      attrs._plugins.forEach(plugin => router.plugin(plugin));
    }
    if (attrs && attrs._states) {
      attrs._states.forEach(state => router.register(state));
    }
    if (attrs && attrs._otherwise) {
      router.otherwise(attrs._otherwise);
    }
    super(attrs);
    this[UIROUTER] = router;
    this[SET_CONTEXT](UIROUTER_CONTEXT, router);
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
