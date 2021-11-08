import { Component, ComponentAttributes, __, isObject, setAttribute, addEvent, removeEvent } from 'jinge';
import { RawParams, StateOrName } from '@uirouter/core';
import { BaseRouter } from '../core';
import { UIViewAddress } from './view';

const SUPPORTED_TARGETS = ['_blank', '_self'];

export class UISrefComponent extends Component {
  static get template(): string {
    return `
<a
 slot-use:default
 e:class="!className && !(isActive && active) ? _udef : (className || '') + (isActive && active ? (className ? ' ' : '') + active : '')"
 e:style="style"
>
\${text}
</a>`;
  }

  _router: BaseRouter;
  _el: HTMLElement;
  _dereg: () => void;
  _tag: number;
  _clickHandler: EventListener;
  _to: StateOrName;
  _target: string;
  _active: string;
  _params: RawParams;

  isActive: boolean;
  location: 'replace' | boolean;
  reload: boolean;
  text: string;
  className: string;
  style: string;

  constructor(attrs: ComponentAttributes) {
    if (attrs.params && !isObject(attrs.params)) {
      throw new Error('<ui-sref> attribute "params" require object.');
    }
    if (attrs.target && SUPPORTED_TARGETS.indexOf(attrs.target as string) < 0) {
      throw new Error(`<ui-sref> attribute "target" only accept one of ${JSON.stringify(SUPPORTED_TARGETS)}`);
    }
    super(attrs);
    const router = this.__getContext('ui-router');
    if (!router || !(router instanceof BaseRouter)) {
      throw new Error('<ui-sref/> must be used under <ui-router/>');
    }
    this._router = router as BaseRouter;

    this._el = null;
    this._dereg = null;
    this._tag = attrs[__].slots?.default ? 0 : -1;
    this._clickHandler = this._onClick.bind(this);

    this.isActive = false;
    this.to = attrs.to as string;
    this.params = attrs.params as Record<string, unknown>;
    this.active = attrs.active as string;
    this.location = 'location' in attrs ? (attrs.location as string as 'replace') : true;
    this.reload = !!attrs.reload;
    this.text = (attrs.text as string) || '';
    this.target = (attrs.target as string) || '_self';
    this.className = attrs.class as string;
    this.style = attrs.style as string;

    /**
     * 切换语言后，不少场景下都需要更新链接，比如 baseHref 或 url 参数需要相应地改变，等等。
     * 考虑到一个页面同时渲染的链接不会太多（就算 1000 个更新也很快），就统一在i18n 的 locale 变化时更新链接。
     */
    this.__i18nWatch(this._updateHref);
  }

  get target(): string {
    return this._target;
  }

  set target(v: string) {
    if (this._target === v) return;
    this._target = v;
    this.__updateIfNeed(this._updateTarget);
  }

  get to(): StateOrName {
    return this._to;
  }

  set to(v: StateOrName) {
    if (this._to === v) return;
    this._to = v;
    this.__updateIfNeed(this._updateHref);
  }

  get params(): RawParams {
    return this._params;
  }

  set params(v: RawParams) {
    this._params = v;
    this.__updateIfNeed(this._updateHref);
  }

  get active(): string {
    return this._active;
  }

  set active(v: string) {
    if (this._active === v) return;
    if (this._tag >= 0 && this._active && this._el) {
      this._el.classList.remove(this._active); // remove previous active class
    }
    this._active = v;
    this.__updateIfNeed(this._updateActive);
  }

  _onClick(e: KeyboardEvent): void {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey) {
      return;
    }
    if (this._tag <= 0) {
      e.preventDefault(); // prevent default <a> jump
    }
    const router = this._router;
    const parent = this.__getContext('ui-router-parent') as UIViewAddress;
    const parentContext = (parent && parent.context) || router.stateRegistry.root();
    if (this._target === '_blank') {
      const href = router.href(this._to, this._params, {
        relative: parentContext,
        inherit: true,
      });
      window.open(href);
    } else {
      router.go(this._to, this._params, {
        relative: parentContext,
        inherit: true,
        location: this.location,
        reload: this.reload,
      });
    }
  }

  __afterRender(): void {
    const el = this.__firstDOM as HTMLElement;
    if (this._tag >= 0) {
      this._tag = el.tagName === 'A' ? 0 : 1;
    }
    this._el = el;
    this._dereg = this._router.transitionService.onSuccess({}, () => this._updateActive()) as () => void;
    this._updateTarget();
    this._updateHref();
    this._updateActive();
    addEvent(el, 'click', this._clickHandler);
  }

  __beforeDestroy(): void {
    removeEvent(this._el, 'click', this._clickHandler);
    this._dereg();
  }

  _updateTarget(): void {
    if (this._tag <= 0) {
      setAttribute(this._el, 'target', this._target);
    }
  }

  _updateHref(): void {
    const router = this._router;
    this.isActive = router.includes(this._to, this._params);
    if (this._tag <= 0) {
      const parent = this.__getContext('ui-router-parent') as UIViewAddress;
      const parentContext = (parent && parent.context) || router.stateRegistry.root();
      setAttribute(
        this._el,
        'href',
        router.href(this._to, this._params, {
          relative: parentContext,
          inherit: true,
        }),
      );
    }
  }

  _updateActive(): void {
    this.isActive = this._router.includes(this._to, this._params);
    if (!this._active || this._tag < 0) return;
    if (this.isActive) {
      this._el.classList.add(this._active);
    } else {
      this._el.classList.remove(this._active);
    }
  }
}
