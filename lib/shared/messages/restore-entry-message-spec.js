// @flow

import invariant from 'invariant';

import { messageTypes } from '../../types/message-types';
import type {
  RawRestoreEntryMessageInfo,
  RestoreEntryMessageData,
  RestoreEntryMessageInfo,
} from '../../types/messages/restore-entry';
import { prettyDate } from '../../utils/date-utils';
import { stringForUser } from '../user-utils';
import type { MessageSpec } from './message-spec';
import { assertSingleMessageInfo } from './utils';

export const restoreEntryMessageSpec: MessageSpec<
  RestoreEntryMessageData,
  RawRestoreEntryMessageInfo,
  RestoreEntryMessageInfo,
> = Object.freeze({
  messageContent(data) {
    return JSON.stringify({
      entryID: data.entryID,
      date: data.date,
      text: data.text,
    });
  },

  rawMessageInfoFromRow(row) {
    const content = JSON.parse(row.content);
    return {
      type: messageTypes.RESTORE_ENTRY,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      entryID: content.entryID,
      date: content.date,
      text: content.text,
    };
  },

  createMessageInfo(rawMessageInfo, creator) {
    return {
      type: messageTypes.RESTORE_ENTRY,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator,
      time: rawMessageInfo.time,
      entryID: rawMessageInfo.entryID,
      date: rawMessageInfo.date,
      text: rawMessageInfo.text,
    };
  },

  rawMessageInfoFromMessageData(messageData, id) {
    return { ...messageData, id };
  },

  robotext(messageInfo, creator) {
    const date = prettyDate(messageInfo.date);
    return (
      `${creator} restored an event scheduled for ${date}: ` +
      `"${messageInfo.text}"`
    );
  },

  notificationTexts(messageInfos, threadInfo, params) {
    const messageInfo = assertSingleMessageInfo(messageInfos);
    invariant(
      messageInfo.type === messageTypes.RESTORE_ENTRY,
      'messageInfo should be messageTypes.RESTORE_ENTRY!',
    );
    const prefix = stringForUser(messageInfo.creator);
    const body =
      `restored an event in ${params.notifThreadName(threadInfo)} ` +
      `scheduled for ${prettyDate(messageInfo.date)}: "${messageInfo.text}"`;
    const merged = `${prefix} ${body}`;
    return {
      merged,
      title: threadInfo.uiName,
      body,
      prefix,
    };
  },

  generatesNotifs: true,
});