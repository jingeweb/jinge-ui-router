import {
  Component,
} from 'jinge/core/component';
import {
  Symbol
} from 'jinge/util';
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
    this.setContext(UIROUTER_CONTEXT, router);
  }
  afterRender() {
    this[UIROUTER].start();
    // window.__DEBUG = this[UIROUTER];
  }
  beforeDestroy() {
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