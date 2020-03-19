// @flow

import {
  type ChatMessageInfoItem,
  chatMessageItemPropType,
} from 'lib/selectors/chat-selectors';
import {
  messageTypes,
  type SendMessageResult,
  type SendMessagePayload,
  type RawComposableMessageInfo,
  type RawTextMessageInfo,
  assertComposableMessageType,
} from 'lib/types/message-types';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import type { AppState } from '../redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import {
  chatInputStatePropType,
  type ChatInputState,
} from './chat-input-state';

import * as React from 'react';
import invariant from 'invariant';
import PropTypes from 'prop-types';

import { messageID } from 'lib/shared/message-utils';
import { connect } from 'lib/utils/redux-utils';
import {
  sendTextMessageActionTypes,
  sendTextMessage,
} from 'lib/actions/message-actions';

import css from './chat-message-list.css';
import multimediaMessageSendFailed from './multimedia-message-send-failed';

type Props = {|
  item: ChatMessageInfoItem,
  threadInfo: ThreadInfo,
  chatInputState: ChatInputState,
  // Redux state
  rawMessageInfo: RawComposableMessageInfo,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  sendTextMessage: (
    threadID: string,
    localID: string,
    text: string,
  ) => Promise<SendMessageResult>,
|};
class FailedSend extends React.PureComponent<Props> {
  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    threadInfo: threadInfoPropType.isRequired,
    chatInputState: chatInputStatePropType.isRequired,
    rawMessageInfo: PropTypes.object.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    sendTextMessage: PropTypes.func.isRequired,
  };
  retryingText = false;
  retryingMedia = false;

  componentDidUpdate(prevProps: Props) {
    const newItem = this.props.item;
    const prevItem = prevProps.item;
    const isFailed = multimediaMessageSendFailed(
      this.props.item,
      this.props.chatInputState,
    );
    const wasFailed = multimediaMessageSendFailed(
      prevProps.item,
      prevProps.chatInputState,
    );
    const isDone =
      this.props.item.messageInfo.id !== null &&
      this.props.item.messageInfo.id !== undefined;
    const wasDone =
      prevProps.item.messageInfo.id !== null &&
      prevProps.item.messageInfo.id !== undefined;
    if ((isFailed && !wasFailed) || (isDone && !wasDone)) {
      this.retryingMedia = false;
    }
  }

  render() {
    return (
      <div className={css.failedSend}>
        <span>Delivery failed.</span>
        <a onClick={this.retrySend} className={css.retrySend}>
          {'Retry?'}
        </a>
      </div>
    );
  }

  retrySend = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.stopPropagation();

    const { rawMessageInfo } = this.props;
    if (rawMessageInfo.type === messageTypes.TEXT) {
      if (this.retryingText) {
        return;
      }
      const newRawMessageInfo = { ...rawMessageInfo, time: Date.now() };
      this.props.dispatchActionPromise(
        sendTextMessageActionTypes,
        this.sendTextMessageAction(newRawMessageInfo),
        undefined,
        newRawMessageInfo,
      );
    } else if (
      rawMessageInfo.type === messageTypes.IMAGES ||
      rawMessageInfo.type === messageTypes.MULTIMEDIA
    ) {
      const { localID } = rawMessageInfo;
      invariant(localID, 'failed RawMessageInfo should have localID');
      if (this.retryingMedia) {
        return;
      }
      this.retryingMedia = true;
      this.props.chatInputState.retryMultimediaMessage(localID);
    }
  };

  async sendTextMessageAction(
    messageInfo: RawTextMessageInfo,
  ): Promise<SendMessagePayload> {
    this.retryingText = true;
    try {
      const { localID } = messageInfo;
      invariant(
        localID !== null && localID !== undefined,
        'localID should be set',
      );
      const result = await this.props.sendTextMessage(
        messageInfo.threadID,
        localID,
        messageInfo.text,
      );
      return {
        localID,
        serverID: result.id,
        threadID: messageInfo.threadID,
        time: result.time,
      };
    } catch (e) {
      e.localID = messageInfo.localID;
      e.threadID = messageInfo.threadID;
      throw e;
    } finally {
      this.retryingText = false;
    }
  }
}

export default connect(
  (state: AppState, ownProps: { item: ChatMessageInfoItem }) => {
    const { messageInfo } = ownProps.item;
    assertComposableMessageType(messageInfo.type);
    const id = messageID(messageInfo);
    const rawMessageInfo = state.messageStore.messages[id];
    assertComposableMessageType(rawMessageInfo.type);
    invariant(
      rawMessageInfo.type === messageTypes.TEXT ||
        rawMessageInfo.type === messageTypes.IMAGES ||
        rawMessageInfo.type === messageTypes.MULTIMEDIA,
      'FailedSend should only be used for composable message types',
    );
    return { rawMessageInfo };
  },
  { sendTextMessage },
)(FailedSend);
