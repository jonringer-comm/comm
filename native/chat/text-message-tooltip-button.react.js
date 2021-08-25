// @flow

import * as React from 'react';
import Animated from 'react-native-reanimated';

import type { AppNavigationProp } from '../navigation/app-navigator.react';
import type { TooltipRoute } from '../navigation/tooltip.react';
import { useSelector } from '../redux/redux-utils';
import { InnerTextMessage } from './inner-text-message.react';
import InputBarHeightMeasurer from './input-bar-height-measurer.react';
import { MessageHeader } from './message-header.react';
import { MessageListContextProvider } from './message-list-types';
import { getSidebarThreadInfo } from './sidebar-navigation';
import { useAnimatedMessageTooltipButton } from './utils';

/* eslint-disable import/no-named-as-default-member */
const { Node, interpolateNode, Extrapolate } = Animated;
/* eslint-enable import/no-named-as-default-member */

type Props = {
  +navigation: AppNavigationProp<'TextMessageTooltipModal'>,
  +route: TooltipRoute<'TextMessageTooltipModal'>,
  +progress: Node,
};
function TextMessageTooltipButton(props: Props): React.Node {
  const { progress } = props;
  const windowWidth = useSelector(state => state.dimensions.width);

  const [
    sidebarInputBarHeight,
    setSidebarInputBarHeight,
  ] = React.useState<?number>(null);

  const { item, verticalBounds, initialCoordinates } = props.route.params;
  const {
    style: messageContainerStyle,
    threadColorOverride,
    isThreadColorDarkOverride,
  } = useAnimatedMessageTooltipButton({
    sourceMessage: item,
    initialCoordinates,
    messageListVerticalBounds: verticalBounds,
    progress,
    targetDraftHeight: sidebarInputBarHeight,
  });

  const headerStyle = React.useMemo(() => {
    const bottom = initialCoordinates.height;
    const opacity = interpolateNode(progress, {
      inputRange: [0, 0.05],
      outputRange: [0, 1],
      extrapolate: Extrapolate.CLAMP,
    });
    return {
      opacity,
      position: 'absolute',
      left: -initialCoordinates.x,
      width: windowWidth,
      bottom,
    };
  }, [initialCoordinates.height, initialCoordinates.x, progress, windowWidth]);

  const threadID = item.threadInfo.id;
  const { navigation } = props;

  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const sidebarThreadInfo = React.useMemo(() => {
    return getSidebarThreadInfo(item, viewerID);
  }, [item, viewerID]);
  const onInputBarMeasured = React.useCallback((height: number) => {
    console.log('sidebar input bar height', height);
    setSidebarInputBarHeight(height);
  }, []);
  let inputBarHeightMeasurer = null;
  if (sidebarThreadInfo) {
    inputBarHeightMeasurer = (
      <InputBarHeightMeasurer
        threadInfo={sidebarThreadInfo}
        onInputBarMeasured={onInputBarMeasured}
      />
    );
  }

  return (
    <MessageListContextProvider threadID={threadID}>
      {inputBarHeightMeasurer}
      <Animated.View style={messageContainerStyle}>
        <Animated.View style={headerStyle}>
          <MessageHeader item={item} focused={true} display="modal" />
        </Animated.View>
        <InnerTextMessage
          item={item}
          onPress={navigation.goBackOnce}
          threadColorOverride={threadColorOverride}
          isThreadColorDarkOverride={isThreadColorDarkOverride}
        />
      </Animated.View>
    </MessageListContextProvider>
  );
}

export default TextMessageTooltipButton;
