import {
  UIRouter,
  servicesPlugin,
  pushStateLocationPlugin,
  hashLocationPlugin,
  LocationPlugin,
  StateDeclaration,
  StateOrName,
  RawParams,
  TransitionOptions,
  TransitionPromise,
  StateParams,
  Transition,
  StateObject,
  PathNode
} from '@uirouter/core';
import {
  jingeViewsBuilder,
  JingeViewConfig
} from './view';
import {
  UIRedirect
} from './components/redirect';
import {
  JingeViewDeclaration, ComponentConstructor
} from './common';

function viewConfigFactory(path: PathNode[], decl: JingeViewDeclaration): JingeViewConfig {
  return new JingeViewConfig(path, decl);
}

export interface RouterOptions {
  trace?: boolean;
}

export interface RouteDefine extends StateDeclaration {
  component?: ComponentConstructor;
}

export class BaseRouter extends UIRouter {
  _started: boolean;

  constructor(locationPlugin: (router: UIRouter) => LocationPlugin, options?: RouterOptions) {
    super();
    this.viewService._pluginapi._viewConfigFactory('jinge', viewConfigFactory);
    this.stateRegistry.decorator('views', jingeViewsBuilder);
    this._started = false;
    if (options?.trace) this.trace.enable(1);
    this.plugin(servicesPlugin);
    this.plugin(locationPlugin);
  }

  register(...stateDefines: RouteDefine[]): BaseRouter {
    stateDefines.forEach(stateDef => {
      if (stateDef.redirectTo && !stateDef.component) {
        stateDef.component = UIRedirect;
      }
      this.stateRegistry.register(stateDef);
    });
    return this;
  }

  /**
   * @param {String} stateName name of target state
   */
  otherwise(stateName: string): BaseRouter {
    this.urlRouter.otherwise({
      state: stateName
    });
    return this;
  }

  start(): void {
    if (this._started) throw new Error('has been started');
    this.urlService.listen();
    this.urlService.sync();
    this._started = true;
  }

  includes(stateOrName: StateOrName, params?: RawParams, options?: TransitionOptions): boolean {
    return this.stateService.includes(stateOrName, params, options);
  }

  href(stateOrName: StateOrName, params?: RawParams, options?: unknown): string {
    return this.stateService.href(stateOrName, params, options);
  }

  go(to: StateOrName, params?: RawParams, options?: TransitionOptions): TransitionPromise {
    return this.stateService.go(to, params, options);
  }

  get params(): StateParams {
    return this.stateService.params;
  }

  get transition(): Transition {
    return this.stateService.transition;
  }

  get current(): StateObject {
    return this.stateService.$current;
  }

  get baseHref(): string {
    return this.locationConfig.baseHref();
  }

  // set baseHref(v: string) {
  //   this.locationConfig.baseHref(v);
  // }
}

export class HashRouter extends BaseRouter {
  constructor(options?: RouterOptions) {
    super(hashLocationPlugin, options);
  }
}

export class Html5Router extends BaseRouter {
  constructor(options?: RouterOptions) {
    super(pushStateLocationPlugin, options);
  }
}
