// @flow

import type { AppState } from '../redux/redux-setup';
import { messageStorePruneActionType } from 'lib/actions/message-actions';
import type { DispatchActionPayload } from 'lib/utils/action-utils';

import * as React from 'react';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';

import {
  nextMessagePruneTimeSelector,
  pruneThreadIDsSelector,
} from '../selectors/message-selectors';

type Props = {|
  // Redux state
  nextMessagePruneTime: ?number,
  pruneThreadIDs: () => $ReadOnlyArray<string>,
  foreground: boolean,
  frozen: boolean,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
|};
class MessageStorePruner extends React.PureComponent<Props> {
  static propTypes = {
    nextMessagePruneTime: PropTypes.number,
    pruneThreadIDs: PropTypes.func.isRequired,
    foreground: PropTypes.bool.isRequired,
    frozen: PropTypes.bool.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
  };

  componentDidUpdate(prevProps: Props) {
    if (this.props.frozen) {
      return;
    }
    const { nextMessagePruneTime } = this.props;
    if (nextMessagePruneTime === null || nextMessagePruneTime === undefined) {
      return;
    }
    const timeUntilExpiration = nextMessagePruneTime - Date.now();
    if (timeUntilExpiration > 0) {
      return;
    }
    const threadIDs = this.props.pruneThreadIDs();
    if (threadIDs.length === 0) {
      return;
    }
    this.props.dispatchActionPayload(messageStorePruneActionType, {
      threadIDs,
    });
  }

  render() {
    return null;
  }
}

export default connect(
  (state: AppState) => ({
    nextMessagePruneTime: nextMessagePruneTimeSelector(state),
    pruneThreadIDs: pruneThreadIDsSelector(state),
    // We include this so that componentDidUpdate will be called on foreground
    foreground: state.foreground,
    frozen: state.frozen,
  }),
  null,
  true,
)(MessageStorePruner);
