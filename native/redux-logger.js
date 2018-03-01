// @flow

import type { AppState } from './redux-setup';

import { REHYDRATE } from 'redux-persist';

class ReduxLogger {

  static n = 20;
  lastNActions = [];
  lastNStates = [];

  get preloadedState(): AppState {
    return this.lastNStates[0];
  }

  addAction(action: *, state: AppState) {
    if (action.type === REHYDRATE) {
      // redux-persist can't handle replaying REHYDRATE
      // https://github.com/rt2zz/redux-persist/issues/743
      this.lastNActions = [];
      this.lastNStates = [];
      return;
    }
    if (this.lastNActions.length === ReduxLogger.n) {
      this.lastNActions.shift();
      this.lastNStates.shift();
    }
    this.lastNActions.push(action);
    this.lastNStates.push(state);
  }

}

const reduxLogger = new ReduxLogger();

export default reduxLogger;
