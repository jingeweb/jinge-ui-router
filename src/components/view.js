import {
  ResolveContext
} from '@uirouter/core';
import {
  instanceOf,
  Symbol,
  isString,
  STR_DEFAULT,
  STR_JINGE,
  STR_EMPTY,
  wrapAttrs,
  Component,
  RENDER,
  CONTEXT,
  UPDATE_IF_NEED,
  UPDATE,
  GET_CONTEXT,
  SET_CONTEXT,
  createComment,
  getParent,
  insertBefore,
  removeChild,
  replaceChild,
  DESTROY,
  isComponent,
  ROOT_NODES,
  GET_FIRST_DOM,
  HANDLE_AFTER_RENDER,
  BEFORE_DESTROY
} from 'jinge';
import {
  UIROUTER,
  UIROUTER_CONTEXT,
  UIROUTER_CONTEXT_PARENT,
  BaseRouter as CoreRouter
} from '../core';

const UIVIEW_RESOLVES = Symbol('resolves');
const UIVIEW_COMPONENT = Symbol('component');
const UIVIEW_DATA = Symbol('data');
const UIVIEW_ADDRESS = Symbol('address');
const UIVIEW_CONFIG_UPDATED = Symbol();
// eslint-disable-next-line camelcase
const UIVIEW_deregister = Symbol('deregister');
const TransitionPropCollisionError = new Error(
  '`transition` cannot be used as resolve token. Please rename your resolve to avoid conflicts with the router transition.'
);

const EXCLUDES = ['$transition$', '$stateParams', '$state$'];
let AUTO_INC_ID = 0;

function createEl(ComponentClass, resolves, context) {
  const attrs = {
    [CONTEXT]: context
  };
  if (resolves) Object.assign(attrs, resolves);
  return new ComponentClass(wrapAttrs(attrs));
}

export class UIView extends Component {
  constructor(attrs) {
    super(attrs);
    const router = this[GET_CONTEXT](UIROUTER_CONTEXT);
    if (!router || !instanceOf(router, CoreRouter)) {
      throw new Error('RouterView must under parent which has context named Router.CONTEXT_NAME');
    }
    this[UIROUTER] = router;
    const parent = this[GET_CONTEXT](UIROUTER_CONTEXT_PARENT) || {
      fqn: '', context: router.stateRegistry.root()
    };
    const name = attrs.name || STR_DEFAULT;
    const uiViewData = {
      $type: STR_JINGE,
      id: ++AUTO_INC_ID,
      name: name,
      fqn: parent.fqn ? parent.fqn + '.' + name : name,
      creationContext: parent.context,
      configUpdated: this[UIVIEW_CONFIG_UPDATED].bind(this),
      config: undefined
    };
    const uiViewAddress = {
      fqn: uiViewData.fqn,
      context: undefined
    };
    // if (uiViewData.id === 2) {
    //   console.log(parent.context);
    //   debugger;
    // }
    this[SET_CONTEXT](UIROUTER_CONTEXT_PARENT, uiViewAddress, true);
    this[UIVIEW_COMPONENT] = this[UIVIEW_RESOLVES] = null;
    this[UIVIEW_ADDRESS] = uiViewAddress;
    this[UIVIEW_DATA] = uiViewData;
    this[UIVIEW_deregister] = router.viewService.registerUIView(uiViewData);
  }

  [RENDER]() {
    const roots = this[ROOT_NODES];
    const componentClass = this[UIVIEW_COMPONENT];
    if (!componentClass) {
      roots.push(createComment(STR_EMPTY));
      return roots;
    }
    const el = createEl(componentClass, this[UIVIEW_RESOLVES], this[CONTEXT]);
    roots.push(el);
    return el[RENDER]();
  }

  [UIVIEW_CONFIG_UPDATED](newConfig) {
    // console.log('cfg', newConfig, this[UIVIEW_DATA].id);
    const uiViewData = this[UIVIEW_DATA];
    if (uiViewData.config === newConfig) return;

    // console.log('update:', this[UIVIEW_DATA].id);
    let resolves = null;

    if (newConfig) {
      this[UIVIEW_ADDRESS].context = newConfig.viewDecl && newConfig.viewDecl.$context;
      const resolveContext = new ResolveContext(newConfig.path);
      const injector = resolveContext.injector();

      const stringTokens = resolveContext.getTokens().filter(t => isString(t) && EXCLUDES.indexOf(t) < 0);
      if (stringTokens.indexOf('transition') !== -1) {
        throw TransitionPropCollisionError;
      }

      if (stringTokens.length > 0) {
        resolves = {};
        stringTokens.forEach(token => {
          resolves[token] = injector.get(token);
        });
      }
    }

    uiViewData.config = newConfig;
    this[UIVIEW_COMPONENT] = newConfig && newConfig.viewDecl && newConfig.viewDecl.component;
    this[UIVIEW_RESOLVES] = resolves;
    this[UPDATE_IF_NEED](false);
  }

  [UPDATE]() {
    const roots = this[ROOT_NODES];
    const preEl = roots[0];
    const isC = isComponent(preEl);
    const newComponent = this[UIVIEW_COMPONENT];
    if (!newComponent && !isC) {
      return;
    }
    const el = newComponent ? createEl(newComponent, this[UIVIEW_RESOLVES], this[CONTEXT]) : createComment(STR_EMPTY);
    const fd = isC ? preEl[GET_FIRST_DOM]() : preEl;
    const pa = getParent(fd);
    if (newComponent) {
      /**
       * 如果 newComponent 中有子 <ui-view/>，并且其兄弟状态也有 <ui-view/>，
       * `el[RENDER]()` 执行时，会触发 `preEl[DESTROY]()` 从而导致
       * `fd` 这个元素被从 DOM 中删除。临时的解决方案是，
       * 在执行 `el[RENDER]()` 之前，插入一个游标元素。
       */
      const cursorCmt = createComment('ui-view-cursor');
      insertBefore(
        pa,
        cursorCmt,
        fd
      );
      replaceChild(
        pa,
        el[RENDER](),
        cursorCmt
      );
    } else {
      insertBefore(pa, el, fd);
    }
    if (isC) {
      preEl[DESTROY]();
    } else {
      removeChild(pa, fd);
    }
    roots[0] = el;
    newComponent && el[HANDLE_AFTER_RENDER]();
  }

  [BEFORE_DESTROY]() {
    this[UIVIEW_deregister]();
  }
}
