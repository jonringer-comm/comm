// @flow

import { convertThreadID } from '../shared/thread-utils';
import type {
  ActivityUpdate,
  ActivityUpdateSuccessPayload,
  SetThreadUnreadStatusPayload,
  SetThreadUnreadStatusRequest,
  SetThreadUnreadStatusResult,
} from '../types/activity-types';
import type { FetchJSON } from '../utils/fetch-json';

const updateActivityActionTypes = Object.freeze({
  started: 'UPDATE_ACTIVITY_STARTED',
  success: 'UPDATE_ACTIVITY_SUCCESS',
  failed: 'UPDATE_ACTIVITY_FAILED',
});
const updateActivity = (
  fetchJSON: FetchJSON,
): ((
  activityUpdates: $ReadOnlyArray<ActivityUpdate>,
) => Promise<ActivityUpdateSuccessPayload>) => async activityUpdates => {
  const serverActivityUpdates = activityUpdates.map(
    (activityUpdate: ActivityUpdate) => ({
      ...activityUpdate,
      threadID: convertThreadID(activityUpdate.threadID, 'client_to_server'),
    }),
  );
  const response = await fetchJSON('update_activity', {
    updates: serverActivityUpdates,
  });
  const unfocusedToUnread = response.unfocusedToUnread.map(
    convertThreadID,
    'server_to_client',
  );
  return {
    activityUpdates,
    result: {
      unfocusedToUnread,
    },
  };
};

const setThreadUnreadStatusActionTypes = Object.freeze({
  started: 'SET_THREAD_UNREAD_STATUS_STARTED',
  success: 'SET_THREAD_UNREAD_STATUS_SUCCESS',
  failed: 'SET_THREAD_UNREAD_STATUS_FAILED',
});
const setThreadUnreadStatus = (
  fetchJSON: FetchJSON,
): ((
  request: SetThreadUnreadStatusRequest,
) => Promise<SetThreadUnreadStatusPayload>) => async request => {
  const serverRequest = {
    ...request,
    threadID: convertThreadID(request.threadID, 'client_to_server'),
  };
  const response: SetThreadUnreadStatusResult = await fetchJSON(
    'set_thread_unread_status',
    serverRequest,
  );
  return {
    resetToUnread: response.resetToUnread,
    threadID: request.threadID,
  };
};

export {
  updateActivityActionTypes,
  updateActivity,
  setThreadUnreadStatusActionTypes,
  setThreadUnreadStatus,
};
