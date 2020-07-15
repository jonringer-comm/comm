// @flow

import type { Dimensions } from 'lib/types/media-types';

import * as React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  initialWindowMetrics,
  useSafeAreaFrame,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import PropTypes from 'prop-types';
import {
  addKeyboardShowListener,
  addKeyboardDismissListener,
  removeKeyboardListener,
  androidKeyboardResizesFrame,
} from '../keyboard/keyboard';

import { updateDimensionsActiveType } from './action-types';

export type DimensionsInfo = {|
  ...Dimensions,
  topInset: number,
  bottomInset: number,
  tabBarHeight: number,
|};

const dimensionsInfoPropType = PropTypes.exact({
  height: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
  topInset: PropTypes.number.isRequired,
  bottomInset: PropTypes.number.isRequired,
  tabBarHeight: PropTypes.number.isRequired,
});

type Metrics = {|
  +frame: {| +x: number, +y: number, +width: number, +height: number |},
  +insets: {| +top: number, +left: number, +right: number, +bottom: number |},
|};
function dimensionsUpdateFromMetrics(metrics: Metrics): $Shape<DimensionsInfo> {
  return {
    height: metrics.frame.height,
    width: metrics.frame.width,
    topInset: androidKeyboardResizesFrame ? 0 : metrics.insets.top,
    bottomInset: androidKeyboardResizesFrame ? 0 : metrics.insets.bottom,
  };
}

const defaultDimensionsInfo = {
  ...dimensionsUpdateFromMetrics(initialWindowMetrics),
  tabBarHeight: 50,
};

function DimensionsUpdater() {
  const dimensions = useSelector(state => state.dimensions);
  const dispatch = useDispatch();

  const frame = useSafeAreaFrame();
  const insets = useSafeAreaInsets();

  const keyboardShowingRef = React.useRef();
  const keyboardShow = React.useCallback(() => {
    keyboardShowingRef.current = true;
  }, []);
  const keyboardDismiss = React.useCallback(() => {
    keyboardShowingRef.current = false;
  }, []);
  React.useEffect(() => {
    if (!androidKeyboardResizesFrame) {
      return;
    }
    const showListener = addKeyboardShowListener(keyboardShow);
    const dismissListener = addKeyboardDismissListener(keyboardDismiss);
    return () => {
      removeKeyboardListener(showListener);
      removeKeyboardListener(dismissListener);
    };
  }, [keyboardShow, keyboardDismiss]);
  const keyboardShowing = keyboardShowingRef.current;

  React.useEffect(() => {
    if (keyboardShowing) {
      return;
    }
    const updates = dimensionsUpdateFromMetrics({ frame, insets });
    for (let key in updates) {
      if (updates[key] === dimensions[key]) {
        continue;
      }
      dispatch({
        type: updateDimensionsActiveType,
        payload: updates,
      });
      return;
    }
  }, [keyboardShowing, dimensions, dispatch, frame, insets]);

  return null;
}

export { dimensionsInfoPropType, defaultDimensionsInfo, DimensionsUpdater };
