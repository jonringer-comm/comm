// @flow

import invariant from 'invariant';

import { convertCalendarQuery } from '../shared/entry-utils';
import {
  convertRawMessageInfos,
  convertMessageTruncationStatuses,
} from '../shared/message-utils';
import {
  convertThreadID,
  convertUpdateThreadRequest,
  convertClientNewThreadRequest,
} from '../shared/thread-utils';
import { convertClientUpdateInfo } from '../shared/update-utils';
import type {
  ChangeThreadSettingsPayload,
  LeaveThreadPayload,
  UpdateThreadRequest,
  ClientNewThreadRequest,
  NewThreadResult,
  ClientThreadJoinRequest,
  ThreadJoinPayload,
} from '../types/thread-types';
import type { FetchJSON } from '../utils/fetch-json';
import { values } from '../utils/objects';

const deleteThreadActionTypes = Object.freeze({
  started: 'DELETE_THREAD_STARTED',
  success: 'DELETE_THREAD_SUCCESS',
  failed: 'DELETE_THREAD_FAILED',
});
const deleteThread = (
  fetchJSON: FetchJSON,
): ((
  threadID: string,
  currentAccountPassword: string,
) => Promise<LeaveThreadPayload>) => async (
  threadID,
  currentAccountPassword,
) => {
  const response = await fetchJSON('delete_thread', {
    threadID: convertThreadID(threadID, 'client_to_server'),
    accountPassword: currentAccountPassword,
  });
  return {
    updatesResult: {
      newUpdates: response.updatesResult.newUpdates.map(updateInfo =>
        convertClientUpdateInfo(updateInfo, 'server_to_client'),
      ),
    },
  };
};

const changeThreadSettingsActionTypes = Object.freeze({
  started: 'CHANGE_THREAD_SETTINGS_STARTED',
  success: 'CHANGE_THREAD_SETTINGS_SUCCESS',
  failed: 'CHANGE_THREAD_SETTINGS_FAILED',
});
const changeThreadSettings = (
  fetchJSON: FetchJSON,
): ((
  request: UpdateThreadRequest,
) => Promise<ChangeThreadSettingsPayload>) => async request => {
  const serverRequest = convertUpdateThreadRequest(request, 'client_to_server');
  const response = await fetchJSON('update_thread', serverRequest);
  invariant(
    Object.keys(request.changes).length > 0,
    'No changes provided to changeThreadSettings!',
  );
  return {
    threadID: request.threadID,
    updatesResult: {
      newUpdates: response.updatesResult.newUpdates.map(updateInfo =>
        convertClientUpdateInfo(updateInfo, 'server_to_client'),
      ),
    },
    newMessageInfos: convertRawMessageInfos(
      response.newMessageInfos,
      'server_to_client',
    ),
  };
};

const removeUsersFromThreadActionTypes = Object.freeze({
  started: 'REMOVE_USERS_FROM_THREAD_STARTED',
  success: 'REMOVE_USERS_FROM_THREAD_SUCCESS',
  failed: 'REMOVE_USERS_FROM_THREAD_FAILED',
});
const removeUsersFromThread = (
  fetchJSON: FetchJSON,
): ((
  threadID: string,
  memberIDs: $ReadOnlyArray<string>,
) => Promise<ChangeThreadSettingsPayload>) => async (threadID, memberIDs) => {
  const response = await fetchJSON('remove_members', {
    threadID: convertThreadID(threadID, 'client_to_server'),
    memberIDs,
  });
  return {
    threadID,
    updatesResult: {
      newUpdates: response.updatesResult.newUpdates.map(update =>
        convertClientUpdateInfo(update, 'server_to_client'),
      ),
    },
    newMessageInfos: convertRawMessageInfos(
      response.newMessageInfos,
      'server_to_client',
    ),
  };
};

const changeThreadMemberRolesActionTypes = Object.freeze({
  started: 'CHANGE_THREAD_MEMBER_ROLES_STARTED',
  success: 'CHANGE_THREAD_MEMBER_ROLES_SUCCESS',
  failed: 'CHANGE_THREAD_MEMBER_ROLES_FAILED',
});
const changeThreadMemberRoles = (
  fetchJSON: FetchJSON,
): ((
  threadID: string,
  memberIDs: $ReadOnlyArray<string>,
  newRole: string,
) => Promise<ChangeThreadSettingsPayload>) => async (
  threadID,
  memberIDs,
  newRole,
) => {
  const response = await fetchJSON('update_role', {
    threadID: convertThreadID(threadID, 'client_to_server'),
    memberIDs,
    role: newRole,
  });
  return {
    threadID,
    updatesResult: {
      newUpdates: response.updatesResult.newUpdates.map(update =>
        convertClientUpdateInfo(update, 'server_to_client'),
      ),
    },
    newMessageInfos: convertRawMessageInfos(
      response.newMessageInfos,
      'server_to_client',
    ),
  };
};

const newThreadActionTypes = Object.freeze({
  started: 'NEW_THREAD_STARTED',
  success: 'NEW_THREAD_SUCCESS',
  failed: 'NEW_THREAD_FAILED',
});
const newThread = (
  fetchJSON: FetchJSON,
): ((
  request: ClientNewThreadRequest,
) => Promise<NewThreadResult>) => async request => {
  const serverRequest = convertClientNewThreadRequest(
    request,
    'client_to_server',
  );
  const response = await fetchJSON('create_thread', serverRequest);
  return {
    newThreadID: convertThreadID(response.newThreadID, 'server_to_client'),
    updatesResult: {
      newUpdates: response.updatesResult.newUpdates.map(update =>
        convertClientUpdateInfo(update, 'server_to_client'),
      ),
    },
    newMessageInfos: convertRawMessageInfos(
      response.newMessageInfos,
      'server_to_client',
    ),
    userInfos: response.userInfos,
  };
};

const joinThreadActionTypes = Object.freeze({
  started: 'JOIN_THREAD_STARTED',
  success: 'JOIN_THREAD_SUCCESS',
  failed: 'JOIN_THREAD_FAILED',
});
const joinThread = (
  fetchJSON: FetchJSON,
): ((
  request: ClientThreadJoinRequest,
) => Promise<ThreadJoinPayload>) => async request => {
  const serverRequest: ClientThreadJoinRequest = {
    threadID: convertThreadID(request.threadID, 'client_to_server'),
    calendarQuery: convertCalendarQuery(
      request.calendarQuery,
      'client_to_server',
    ),
  };
  const response = await fetchJSON('join_thread', serverRequest);
  const userInfos = values(response.userInfos);
  return {
    updatesResult: {
      newUpdates: response.updatesResult.newUpdates.map(update =>
        convertClientUpdateInfo(update, 'server_to_client'),
      ),
    },
    rawMessageInfos: convertRawMessageInfos(
      response.rawMessageInfos,
      'server_to_client',
    ),
    truncationStatuses: convertMessageTruncationStatuses(
      response.truncationStatuses,
      'server_to_client',
    ),
    userInfos,
  };
};

const leaveThreadActionTypes = Object.freeze({
  started: 'LEAVE_THREAD_STARTED',
  success: 'LEAVE_THREAD_SUCCESS',
  failed: 'LEAVE_THREAD_FAILED',
});
const leaveThread = (
  fetchJSON: FetchJSON,
): ((threadID: string) => Promise<LeaveThreadPayload>) => async threadID => {
  const response = await fetchJSON('leave_thread', {
    threadID: convertThreadID(threadID, 'client_to_server'),
  });
  return {
    updatesResult: {
      newUpdates: response.updatesResult.newUpdates.map(update =>
        convertClientUpdateInfo(update, 'server_to_client'),
      ),
    },
  };
};
const setThreadStoreActionType = 'SET_THREAD_STORE';

export {
  deleteThreadActionTypes,
  deleteThread,
  changeThreadSettingsActionTypes,
  changeThreadSettings,
  removeUsersFromThreadActionTypes,
  removeUsersFromThread,
  changeThreadMemberRolesActionTypes,
  changeThreadMemberRoles,
  newThreadActionTypes,
  newThread,
  joinThreadActionTypes,
  joinThread,
  leaveThreadActionTypes,
  leaveThread,
  setThreadStoreActionType,
};
