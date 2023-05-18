import { ResolveContext, ActiveUIView } from '@uirouter/core';
import { Component, ComponentAttributes, __, isComponent, createFragment, isString } from 'jinge';
import { BaseRouter as CoreRouter } from '../core';
import { UIViewAddress, ComponentConstructor } from '../common';
import { JingeViewConfig } from '../view';

const TransitionPropCollisionError = new Error(
  '`transition` cannot be used as resolve token. Please rename your resolve to avoid conflicts with the router transition.',
);

const EXCLUDES = ['$transition$', '$stateParams', '$state$'];
let AUTO_INC_ID = 0;

function createEl(
  ComponentClass: ComponentConstructor,
  resolves: Record<string, unknown>,
  context: Record<string, unknown>,
): Component {
  const attrs = {
    [__]: {
      context,
    },
  };
  if (resolves) {
    Object.assign(attrs, resolves);
  }
  return ComponentClass.create(attrs);
}

export class UIViewComponent extends Component {
  _router: CoreRouter;
  _viewComp: ComponentConstructor;
  _viewData: ActiveUIView;
  _viewAddr: UIViewAddress;
  _viewRes: Record<string, unknown>;
  _viewDereg: () => void;

  constructor(attrs: ComponentAttributes) {
    super(attrs);
    const router = this.__getContext('ui-router');
    if (!router || !(router instanceof CoreRouter)) {
      throw new Error('<ui-view/> must be used under <ui-router/>');
    }
    this._router = router as CoreRouter;
    const parent = (this.__getContext('ui-router-parent') as UIViewAddress) || {
      fqn: '',
      context: this._router.stateRegistry.root(),
    };
    const name = (attrs.name as string) || 'default';
    const uiViewData: ActiveUIView = {
      $type: 'jinge',
      id: ++AUTO_INC_ID,
      name: name,
      fqn: parent.fqn ? parent.fqn + '.' + name : name,
      creationContext: parent.context,
      configUpdated: this._onCfgUpdate.bind(this),
      config: undefined,
    };
    const uiViewAddress: UIViewAddress = {
      fqn: uiViewData.fqn,
      context: undefined,
    };
    // if (uiViewData.id === 2) {
    //   console.log(parent.context);
    //   debugger;
    // }
    this.__setContext('ui-router-parent', uiViewAddress, true);
    this._viewComp = null;
    this._viewRes = null;
    this._viewAddr = uiViewAddress;
    this._viewData = uiViewData;
    this._viewDereg = this._router.viewService.registerUIView(uiViewData);
  }

  __doRender() {
    const roots = this[__].rootNodes;
    const componentClass = this._viewComp;
    if (!componentClass) {
      roots.push(document.createComment('empty'));
      return roots as Node[];
    }
    const el = createEl(componentClass, this._viewRes, this[__].context);
    roots.push(el);
    return el.__render();
  }

  _onCfgUpdate(newConfig: JingeViewConfig) {
    // console.log('cfg', newConfig, this[UIVIEW_DATA].id);
    const uiViewData = this._viewData;
    if (uiViewData.config === newConfig) return;

    // console.log('update:', this[UIVIEW_DATA].id);
    let resolves: Record<string, unknown> = null;

    if (newConfig) {
      this._viewAddr.context = newConfig.viewDecl?.$context;
      const resolveContext = new ResolveContext(newConfig.path);
      const injector = resolveContext.injector();

      const stringTokens = resolveContext.getTokens().filter((t) => isString(t) && EXCLUDES.indexOf(t) < 0);
      if (stringTokens.indexOf('transition') !== -1) {
        throw TransitionPropCollisionError;
      }

      if (stringTokens.length > 0) {
        resolves = {};
        stringTokens.forEach((token) => {
          resolves[token] = injector.get(token);
        });
      }
    }

    uiViewData.config = newConfig;
    this._viewComp = newConfig?.viewDecl?.component;
    this._viewRes = resolves;
    this.__updateIfNeed(false);
  }

  async __update() {
    const roots = this[__].rootNodes;
    const preEl = roots[0];
    const isC = isComponent(preEl);
    const newComponent = this._viewComp;
    if (!newComponent && !isC) {
      return;
    }
    const el = newComponent ? createEl(newComponent, this._viewRes, this[__].context) : document.createComment('empty');
    const fd = isC ? (preEl as Component).__firstDOM : (preEl as Node);
    const pa = fd.parentNode;
    if (newComponent) {
      /**
       * 如果 newComponent 中有子 <ui-view/>，并且其兄弟状态也有 <ui-view/>，
       * `el[RENDER]()` 执行时，会触发 `preEl[DESTROY]()` 从而导致
       * `fd` 这个元素被从 DOM 中删除。临时的解决方案是，
       * 在执行 `el[RENDER]()` 之前，插入一个游标元素。
       */
      const cursorCmt = document.createComment('ui-view-cursor');
      pa.insertBefore(cursorCmt, fd);
      const nels = await (el as Component).__render();
      pa.replaceChild(nels.length > 1 ? createFragment(nels) : nels[0], cursorCmt);
    } else {
      pa.insertBefore(el as Node, fd);
    }
    if (isC) {
      await (preEl as Component).__destroy();
    } else {
      pa.removeChild(fd);
    }
    roots[0] = el;
    newComponent && (await (el as Component).__handleAfterRender());
  }

  __beforeDestroy() {
    this._viewDereg();
  }
}
