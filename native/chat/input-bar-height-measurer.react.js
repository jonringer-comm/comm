// @flow

import * as React from 'react';
import { View } from 'react-native';

import type { ThreadInfo } from 'lib/types/thread-types';

import NodeHeightMeasurer from '../components/node-height-measurer.react';
import { DummyChatInputBar } from './chat-input-bar.react';

type Props = {
  +threadInfo: ThreadInfo,
  +onInputBarMeasured: (height: number) => mixed,
};
type ThreadWithInputBarHeight = {
  +threadInfo: ThreadInfo,
  +inputBarHeight: ?number,
};

function getThreadID(threadInfo: ThreadInfo) {
  return threadInfo.id;
}

function dummyChatInputBar(threadInfo: ThreadInfo): React.Element<typeof View> {
  return (
    <View>
      <DummyChatInputBar threadInfo={threadInfo} />
    </View>
  );
}

function mergeItemWithHeight(
  item: ThreadInfo,
  height: ?number,
): ThreadWithInputBarHeight {
  return { threadInfo: item, inputBarHeight: height };
}

function InputBarHeightMeasurer(props: Props): React.Node {
  const { threadInfo, onInputBarMeasured } = props;
  const listData = React.useMemo(() => [threadInfo], [threadInfo]);
  const allHeightsMeasured = React.useCallback(
    (threadsWithHeight: $ReadOnlyArray<ThreadWithInputBarHeight>) => {
      for (const threadWithHeight: ThreadWithInputBarHeight of threadsWithHeight) {
        const height = threadWithHeight.inputBarHeight;
        if (
          threadWithHeight.threadInfo === threadInfo &&
          height !== undefined &&
          height !== null
        ) {
          onInputBarMeasured(height);
          break;
        }
      }
    },
    [onInputBarMeasured, threadInfo],
  );
  return (
    <NodeHeightMeasurer
      listData={listData}
      itemToID={getThreadID}
      itemToMeasureKey={getThreadID}
      itemToDummy={dummyChatInputBar}
      mergeItemWithHeight={mergeItemWithHeight}
      allHeightsMeasured={allHeightsMeasured}
    />
  );
}

export default InputBarHeightMeasurer;
