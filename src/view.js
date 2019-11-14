/**
 * Copied from https://github.com/ui-router/react/blob/master/src/reactViews.tsx
 * Modified by Yuhang Ge
 */

import {
  services,
  ViewService
} from '@uirouter/core';
import {
  mapObject,
  STR_DEFAULT,
  STR_JINGE
} from 'jinge';

export function jingeViewsBuilder(state) {
  const views = {};
  let viewsDefinitionObject;
  if (!state.views) {
    viewsDefinitionObject = {
      [STR_DEFAULT]: {
        component: state.component
      }
    };
  } else {
    viewsDefinitionObject = mapObject(state.views, val => {
      if (val.component) return val;
      return {
        component: val
      };
    });
  }

  for (const name in viewsDefinitionObject) {
    const config = viewsDefinitionObject[name];
    if (Object.keys(config).length === 0) return;
    config.$type = STR_JINGE;
    config.$context = state;
    config.$name = name || STR_DEFAULT;

    const normalized = ViewService.normalizeUIViewTarget(config.$context, config.$name);
    config.$uiViewName = normalized.uiViewName;
    config.$uiViewContextAnchor = normalized.uiViewContextAnchor;

    views[config.$name] = config;
  }
  return views;
}

let AUTO_INC_ID = 0;

export class JingeViewConfig {
  constructor(path, viewDecl) {
    this.loaded = true;
    this.$id = AUTO_INC_ID++;
    this.path = path;
    this.viewDecl = viewDecl;
    // console.log('new config', this.$id, viewDecl);
  }

  load() {
    return services.$q.when(this);
  }
}
