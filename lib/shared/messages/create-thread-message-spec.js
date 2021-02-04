// @flow

import invariant from 'invariant';

import { messageTypes } from '../../types/message-types';
import type {
  CreateThreadMessageData,
  CreateThreadMessageInfo,
  RawCreateThreadMessageInfo,
} from '../../types/messages/create-thread';
import { stringForUser } from '../user-utils';
import type { MessageSpec } from './message-spec';
import { assertSingleMessageInfo } from './utils';

export const createThreadMessageSpec: MessageSpec<
  CreateThreadMessageData,
  RawCreateThreadMessageInfo,
  CreateThreadMessageInfo,
> = Object.freeze({
  messageContent(data) {
    return JSON.stringify(data.initialThreadState);
  },

  rawMessageInfoFromRow(row) {
    return {
      type: messageTypes.CREATE_THREAD,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      initialThreadState: JSON.parse(row.content),
    };
  },

  createMessageInfo(rawMessageInfo, creator, params) {
    const initialParentThreadID =
      rawMessageInfo.initialThreadState.parentThreadID;
    const parentThreadInfo = initialParentThreadID
      ? params.threadInfos[initialParentThreadID]
      : null;

    return {
      type: messageTypes.CREATE_THREAD,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator,
      time: rawMessageInfo.time,
      initialThreadState: {
        name: rawMessageInfo.initialThreadState.name,
        parentThreadInfo,
        type: rawMessageInfo.initialThreadState.type,
        color: rawMessageInfo.initialThreadState.color,
        otherMembers: params.createRelativeUserInfos(
          rawMessageInfo.initialThreadState.memberIDs.filter(
            (userID: string) => userID !== rawMessageInfo.creatorID,
          ),
        ),
      },
    };
  },

  rawMessageInfoFromMessageData(messageData, id) {
    return { ...messageData, id };
  },

  robotext(messageInfo, creator, params) {
    let text = `created ${params.encodedThreadEntity(
      messageInfo.threadID,
      `this thread`,
    )}`;
    const parentThread = messageInfo.initialThreadState.parentThreadInfo;
    if (parentThread) {
      text +=
        ' as a child of ' +
        `<${encodeURI(parentThread.uiName)}|t${parentThread.id}>`;
    }
    if (messageInfo.initialThreadState.name) {
      text += ` with the name "${encodeURI(
        messageInfo.initialThreadState.name,
      )}"`;
    }
    const users = messageInfo.initialThreadState.otherMembers;
    if (users.length !== 0) {
      const initialUsersString = params.robotextForUsers(users);
      text += ` and added ${initialUsersString}`;
    }
    return `${creator} ${text}`;
  },

  notificationTexts(messageInfos, threadInfo, params) {
    const messageInfo = assertSingleMessageInfo(messageInfos);
    invariant(
      messageInfo.type === messageTypes.CREATE_THREAD,
      'messageInfo should be messageTypes.CREATE_THREAD!',
    );
    const parentThreadInfo = messageInfo.initialThreadState.parentThreadInfo;
    if (parentThreadInfo) {
      return params.notifTextForSubthreadCreation(
        messageInfo.creator,
        messageInfo.initialThreadState.type,
        parentThreadInfo,
        messageInfo.initialThreadState.name,
        threadInfo.uiName,
      );
    }
    const prefix = stringForUser(messageInfo.creator);
    const body = 'created a new thread';
    let merged = `${prefix} ${body}`;
    if (messageInfo.initialThreadState.name) {
      merged += ` called "${messageInfo.initialThreadState.name}"`;
    }
    return {
      merged,
      body,
      title: threadInfo.uiName,
      prefix,
    };
  },

  generatesNotifs: true,

  userIDs(rawMessageInfo) {
    return rawMessageInfo.initialThreadState.memberIDs;
  },

  startsThread: true,

  threadIDs(rawMessageInfo) {
    const { parentThreadID } = rawMessageInfo.initialThreadState;
    return parentThreadID ? [parentThreadID] : [];
  },
});