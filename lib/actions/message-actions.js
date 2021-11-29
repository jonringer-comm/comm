// @flow

import invariant from 'invariant';

import { convertRawMessageInfos } from '../shared/message-utils';
import { convertThreadID } from '../shared/thread-utils';
import type {
  FetchMessageInfosPayload,
  SendMessageResult,
} from '../types/message-types';
import type { FetchJSON, FetchResultInfo } from '../utils/fetch-json';

const fetchMessagesBeforeCursorActionTypes = Object.freeze({
  started: 'FETCH_MESSAGES_BEFORE_CURSOR_STARTED',
  success: 'FETCH_MESSAGES_BEFORE_CURSOR_SUCCESS',
  failed: 'FETCH_MESSAGES_BEFORE_CURSOR_FAILED',
});
const fetchMessagesBeforeCursor = (
  fetchJSON: FetchJSON,
): ((
  threadID: string,
  beforeMessageID: string,
) => Promise<FetchMessageInfosPayload>) => async (
  threadID,
  beforeMessageID,
) => {
  const serverThreadID: string = convertThreadID(threadID, 'client_to_server');
  const response = await fetchJSON('fetch_messages', {
    cursors: {
      [serverThreadID]: beforeMessageID,
    },
  });
  return {
    threadID,
    rawMessageInfos: convertRawMessageInfos(
      response.rawMessageInfos,
      'server_to_client',
    ),
    truncationStatus: response.truncationStatuses[serverThreadID],
  };
};

const fetchMostRecentMessagesActionTypes = Object.freeze({
  started: 'FETCH_MOST_RECENT_MESSAGES_STARTED',
  success: 'FETCH_MOST_RECENT_MESSAGES_SUCCESS',
  failed: 'FETCH_MOST_RECENT_MESSAGES_FAILED',
});
const fetchMostRecentMessages = (
  fetchJSON: FetchJSON,
): ((
  threadID: string,
) => Promise<FetchMessageInfosPayload>) => async threadID => {
  const serverThreadID: string = convertThreadID(threadID, 'client_to_server');
  const response = await fetchJSON('fetch_messages', {
    cursors: {
      [serverThreadID]: null,
    },
  });
  return {
    threadID,
    rawMessageInfos: convertRawMessageInfos(
      response.rawMessageInfos,
      'server_to_client',
    ),
    truncationStatus: response.truncationStatuses[serverThreadID],
  };
};

const sendTextMessageActionTypes = Object.freeze({
  started: 'SEND_TEXT_MESSAGE_STARTED',
  success: 'SEND_TEXT_MESSAGE_SUCCESS',
  failed: 'SEND_TEXT_MESSAGE_FAILED',
});
const sendTextMessage = (
  fetchJSON: FetchJSON,
): ((
  threadID: string,
  localID: string,
  text: string,
) => Promise<SendMessageResult>) => async (threadID, localID, text) => {
  let resultInfo;
  const getResultInfo = (passedResultInfo: FetchResultInfo) => {
    resultInfo = passedResultInfo;
  };
  const tmp = convertThreadID(threadID, 'client_to_server');
  const response = await fetchJSON(
    'create_text_message',
    {
      threadID: tmp,
      localID,
      text,
    },
    { getResultInfo },
  );
  const resultInterface = resultInfo?.interface;
  invariant(
    resultInterface,
    'getResultInfo not called before fetchJSON resolves',
  );
  return {
    id: response.newMessageInfo.id,
    time: response.newMessageInfo.time,
    interface: resultInterface,
  };
};

const createLocalMessageActionType = 'CREATE_LOCAL_MESSAGE';

const sendMultimediaMessageActionTypes = Object.freeze({
  started: 'SEND_MULTIMEDIA_MESSAGE_STARTED',
  success: 'SEND_MULTIMEDIA_MESSAGE_SUCCESS',
  failed: 'SEND_MULTIMEDIA_MESSAGE_FAILED',
});
const sendMultimediaMessage = (
  fetchJSON: FetchJSON,
): ((
  threadID: string,
  localID: string,
  mediaIDs: $ReadOnlyArray<string>,
) => Promise<SendMessageResult>) => async (threadID, localID, mediaIDs) => {
  let resultInfo;
  const getResultInfo = (passedResultInfo: FetchResultInfo) => {
    resultInfo = passedResultInfo;
  };
  const response = await fetchJSON(
    'create_multimedia_message',
    {
      threadID: convertThreadID(threadID, 'client_to_server'),
      localID,
      mediaIDs,
    },
    { getResultInfo },
  );
  const resultInterface = resultInfo?.interface;
  invariant(
    resultInterface,
    'getResultInfo not called before fetchJSON resolves',
  );
  return {
    id: response.newMessageInfo.id,
    time: response.newMessageInfo.time,
    interface: resultInterface,
  };
};

const saveMessagesActionType = 'SAVE_MESSAGES';
const processMessagesActionType = 'PROCESS_MESSAGES';
const messageStorePruneActionType = 'MESSAGE_STORE_PRUNE';

export {
  fetchMessagesBeforeCursorActionTypes,
  fetchMessagesBeforeCursor,
  fetchMostRecentMessagesActionTypes,
  fetchMostRecentMessages,
  sendTextMessageActionTypes,
  sendTextMessage,
  createLocalMessageActionType,
  sendMultimediaMessageActionTypes,
  sendMultimediaMessage,
  saveMessagesActionType,
  processMessagesActionType,
  messageStorePruneActionType,
};
