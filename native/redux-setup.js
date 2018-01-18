// @flow

import type { RawThreadInfo } from 'lib/types/thread-types';
import type { EntryStore } from 'lib/types/entry-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { CurrentUserInfo, UserInfo } from 'lib/types/user-types';
import type { MessageStore } from 'lib/types/message-types';
import type { NavInfo } from './navigation-setup';

import React from 'react';
import invariant from 'invariant';
import { REHYDRATE } from 'redux-persist/constants';
import thunk from 'redux-thunk';
import { AsyncStorage } from 'react-native';
import { createStore, applyMiddleware } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import { autoRehydrate, persistStore } from 'redux-persist';
import PropTypes from 'prop-types';
import { NavigationActions } from 'react-navigation';

import baseReducer from 'lib/reducers/master-reducer';
import { newSessionID } from 'lib/selectors/session-selectors';
import { notificationPressActionType } from 'lib/shared/notif-utils';

import { MessageListRouteName } from './chat/message-list.react';
import { activeThreadSelector } from './selectors/nav-selectors';
import {
  handleURLActionType,
  navigateToAppActionType,
  defaultNavInfo,
  reduceNavInfo,
} from './navigation-setup';
import {
  recordAndroidNotificationActionType,
  clearAndroidNotificationActionType,
  reduceThreadIDsToNotifIDs,
} from './push/android';

export type AppState = {|
  navInfo: NavInfo,
  currentUserInfo: ?CurrentUserInfo,
  sessionID: string,
  entryStore: EntryStore,
  lastUserInteraction: {[section: string]: number},
  threadInfos: {[id: string]: RawThreadInfo},
  userInfos: {[id: string]: UserInfo},
  messageStore: MessageStore,
  drafts: {[key: string]: string},
  currentAsOf: number,
  loadingStatuses: {[key: string]: {[idx: number]: LoadingStatus}},
  cookie: ?string,
  deviceToken: ?string,
  threadIDsToNotifIDs: {[threadID: string]: string[]},
  rehydrateConcluded: bool,
|};

const defaultState = ({
  navInfo: defaultNavInfo,
  currentUserInfo: null,
  sessionID: newSessionID(),
  entryStore: {
    entryInfos: {},
    daysToEntries: {},
    lastUserInteractionCalendar: 0,
  },
  lastUserInteraction: { sessionReset: Date.now() },
  threadInfos: {},
  userInfos: {},
  messageStore: {
    messages: {},
    threads: {},
  },
  drafts: {},
  currentAsOf: 0,
  loadingStatuses: {},
  cookie: null,
  deviceToken: null,
  threadIDsToNotifIDs: {},
  rehydrateConcluded: false,
}: AppState);

const blacklist = __DEV__
  ? [
      'sessionID',
      'lastUserInteraction',
      'loadingStatuses',
      'rehydrateConcluded',
    ]
  : [
      'sessionID',
      'lastUserInteraction',
      'loadingStatuses',
      'rehydrateConcluded',
      'navInfo',
    ];

function reducer(state: AppState, action: *) {
  const oldState = state;
  const navInfo = reduceNavInfo(state, action);
  if (navInfo && navInfo !== state.navInfo) {
    state = {
      navInfo,
      currentUserInfo: state.currentUserInfo,
      sessionID: state.sessionID,
      entryStore: state.entryStore,
      lastUserInteraction: state.lastUserInteraction,
      threadInfos: state.threadInfos,
      userInfos: state.userInfos,
      messageStore: state.messageStore,
      drafts: state.drafts,
      currentAsOf: state.currentAsOf,
      loadingStatuses: state.loadingStatuses,
      cookie: state.cookie,
      deviceToken: state.deviceToken,
      threadIDsToNotifIDs: state.threadIDsToNotifIDs,
      rehydrateConcluded: state.rehydrateConcluded,
    };
  }
  if (action.type === REHYDRATE) {
    state = {
      navInfo: state.navInfo,
      currentUserInfo: state.currentUserInfo,
      sessionID: state.sessionID,
      entryStore: state.entryStore,
      lastUserInteraction: state.lastUserInteraction,
      threadInfos: state.threadInfos,
      userInfos: state.userInfos,
      messageStore: state.messageStore,
      drafts: state.drafts,
      currentAsOf: state.currentAsOf,
      loadingStatuses: state.loadingStatuses,
      cookie: state.cookie,
      deviceToken: state.deviceToken,
      threadIDsToNotifIDs: state.threadIDsToNotifIDs,
      rehydrateConcluded: true,
    };
  }
  if (
    action.type === recordAndroidNotificationActionType ||
    action.type === clearAndroidNotificationActionType
  ) {
    return {
      navInfo: state.navInfo,
      currentUserInfo: state.currentUserInfo,
      sessionID: state.sessionID,
      entryStore: state.entryStore,
      lastUserInteraction: state.lastUserInteraction,
      threadInfos: state.threadInfos,
      userInfos: state.userInfos,
      messageStore: state.messageStore,
      drafts: state.drafts,
      currentAsOf: state.currentAsOf,
      loadingStatuses: state.loadingStatuses,
      cookie: state.cookie,
      deviceToken: state.deviceToken,
      threadIDsToNotifIDs: reduceThreadIDsToNotifIDs(
        state.threadIDsToNotifIDs,
        action.payload,
      ),
      rehydrateConcluded: state.rehydrateConcluded,
    };
  }
  // These action type are handled by reduceNavInfo above
  if (
    action.type === handleURLActionType ||
      action.type === navigateToAppActionType ||
      action.type === notificationPressActionType ||
      action.type === NavigationActions.INIT ||
      action.type === NavigationActions.NAVIGATE ||
      action.type === NavigationActions.BACK ||
      action.type === NavigationActions.SET_PARAMS ||
      action.type === NavigationActions.RESET
  ) {
    return validateState(oldState, state);
  }
  return validateState(oldState, baseReducer(state, action));
}

function validateState(oldState: AppState, state: AppState): AppState {
  const oldActiveThread = activeThreadSelector(oldState);
  const activeThread = activeThreadSelector(state);
  if (activeThread && state.threadInfos[activeThread].currentUser.unread) {
    // Makes sure a currently focused thread is never unread
    state = {
      navInfo: state.navInfo,
      currentUserInfo: state.currentUserInfo,
      sessionID: state.sessionID,
      entryStore: state.entryStore,
      lastUserInteraction: state.lastUserInteraction,
      threadInfos: {
        ...state.threadInfos,
        [activeThread]: {
          ...state.threadInfos[activeThread],
          currentUser: {
            ...state.threadInfos[activeThread].currentUser,
            unread: false,
          },
        },
      },
      userInfos: state.userInfos,
      messageStore: state.messageStore,
      drafts: state.drafts,
      currentAsOf: state.currentAsOf,
      loadingStatuses: state.loadingStatuses,
      cookie: state.cookie,
      deviceToken: state.deviceToken,
      threadIDsToNotifIDs: state.threadIDsToNotifIDs,
      rehydrateConcluded: state.rehydrateConcluded,
    };
  }
  if (activeThread && oldActiveThread !== activeThread) {
    // Update messageStore.threads[activeThread].lastNavigatedTo
    state = {
      navInfo: state.navInfo,
      currentUserInfo: state.currentUserInfo,
      sessionID: state.sessionID,
      entryStore: state.entryStore,
      lastUserInteraction: state.lastUserInteraction,
      threadInfos: state.threadInfos,
      userInfos: state.userInfos,
      messageStore: {
        messages: state.messageStore.messages,
        threads: {
          ...state.messageStore.threads,
          [activeThread]: {
            ...state.messageStore.threads[activeThread],
            lastNavigatedTo: Date.now(),
          },
        },
      },
      drafts: state.drafts,
      currentAsOf: state.currentAsOf,
      loadingStatuses: state.loadingStatuses,
      cookie: state.cookie,
      deviceToken: state.deviceToken,
      threadIDsToNotifIDs: state.threadIDsToNotifIDs,
      rehydrateConcluded: state.rehydrateConcluded,
    };
  }
  return state;
}

const store = createStore(
  reducer,
  defaultState,
  composeWithDevTools(
    applyMiddleware(thunk),
    autoRehydrate(),
  ),
);
const persistor = persistStore(store, { storage: AsyncStorage, blacklist });

export {
  store,
  persistor,
};
