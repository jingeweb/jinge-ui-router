import {
  UIRouter,
  servicesPlugin,
  pushStateLocationPlugin,
  hashLocationPlugin
} from '@uirouter/core';
import {
  STR_JINGE,
  isObject,
  isArray,
  isUndefined,
  isFunction
} from 'jinge/util';
import {
  jingeViewsBuilder,
  JingeViewConfig
} from './view';

function viewConfigFactory(node, config) {
  return new JingeViewConfig(node, config);
}

export const UIROUTER_CONTEXT = Symbol('#ui-router_context');
export const UIROUTER_CONTEXT_PARENT = Symbol('#ui-router_parent');
export const UIROUTER = Symbol('router');

export class BaseRouter extends UIRouter {
  static get CONTEXT_NAME() {
    return UIROUTER_CONTEXT;
  }
  constructor(locationPlugin, options) {
    super();
    this.viewService._pluginapi._viewConfigFactory(STR_JINGE, viewConfigFactory);
    this.stateRegistry.decorator('views', jingeViewsBuilder);
    this._started = false;
    if (options && options.trace) this.trace.enable(1);
    this.plugin(servicesPlugin);
    locationPlugin && this.plugin(locationPlugin);
  }
  register(...stateDefines) {
    stateDefines.forEach(stateDef => {
      if (!stateDef.name) throw new Error('ui-router state define require properties: name, component');
      const resolve = stateDef.resolve;
      if (!isUndefined(resolve)) {
        if (resolve === null || !isObject(resolve)) {
          throw new Error(`resolve of state ${stateDef.name} must be object or array. see https://[todo]`);
        }
        if (!isArray(resolve)) {
          stateDef.resolve = Object.keys(resolve).map(k => {
            const rtn = { token: k };
            const v = resolve[k];
            if (isArray(v)) {
              if (v.length > 1) {
                rtn.deps = v.slice(0, v.length - 1);
              }
              rtn.resolveFn = v[v.length - 1];
            } else if (!isFunction(v)) {
              rtn.resolveFn = () => v;
            } else {
              rtn.resolveFn = v;
            }
            return rtn;
          });
          // console.log(stateDef.resolve[0]);
        }
      }
      this.stateRegistry.register(stateDef);
    });
    return this;
  }
  /**
   * @param {String} stateName name of target state
   */
  otherwise(stateName) {
    this.urlRouter.otherwise({state: stateName});
    return this;
  }
  start() {
    if (this._started) throw new Error('has been started');
    this.urlService.listen();
    this.urlService.sync();
    this._started = true;
  }
  includes(...args) {
    return this.stateService.includes(...args);
  }
  href(...args) {
    return this.stateService.href(...args);
  }
  go(...args) {
    return this.stateService.go(...args);
  }
  get params() {
    return this.stateService.params;
  }
  get transition() {
    return this.stateService.transition;
  }
  get current() {
    return this.stateService.$current;
  }
}

export class HashRouter extends BaseRouter {
  constructor(options) {
    super(hashLocationPlugin, options);
  }
}

export class Html5Router extends BaseRouter {
  constructor(options) {
    super(pushStateLocationPlugin, options);
  }
}