import { Component } from 'jinge';

export class UIRedirect extends Component {
  static get template(): string {
    return `
<!-- import { UIViewComponent } from './view'; -->
<UIViewComponent/>`;
  }
}
