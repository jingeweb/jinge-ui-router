import { ComponentAttributes, Component } from 'jinge';
import { UIRouterPlugin, UIRouter } from '@uirouter/core';
import { HashRouter as HashCoreRouter, Html5Router as Html5CoreRouter, BaseRouter, RouteDefine } from '../core';

export interface UIRouterComponentAttributes extends ComponentAttributes {
  router?: BaseRouter | string;
  plugins?: ((router: UIRouter) => UIRouterPlugin)[];
  states?: RouteDefine[];
  otherwise?: string;
}

export class UIRouterComponent extends Component {
  _router: BaseRouter;

  constructor(attrs: UIRouterComponentAttributes) {
    let coreRouter: BaseRouter;
    if (!(attrs.router instanceof BaseRouter)) {
      if ((attrs.router as string) === 'hash') {
        coreRouter = new HashCoreRouter();
      } else {
        coreRouter = new Html5CoreRouter();
      }
    } else {
      coreRouter = attrs.router as BaseRouter;
    }
    if (attrs.plugins) {
      attrs.plugins.forEach((plugin) => coreRouter.plugin(plugin));
    }
    if (attrs.states) {
      attrs.states.forEach((state) => coreRouter.register(state));
    }
    if (attrs.otherwise) {
      coreRouter.otherwise(attrs.otherwise);
    }
    super(attrs);
    this._router = coreRouter;
    this.__setContext('ui-router', coreRouter);

    // this.baseHref = attrs.baseHref;
  }

  get baseHref(): string {
    return this._router.baseHref;
  }

  // set baseHref(v: string) {
  //   this._router.baseHref = v;
  // }

  __afterRender(): void {
    this._router.start();
  }

  __beforeDestroy(): void {
    this._router.dispose();
  }
}
