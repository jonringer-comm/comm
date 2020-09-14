// @flow

import {
  type ChatThreadItem,
  chatThreadItemPropType,
} from 'lib/selectors/chat-selectors';
import {
  type NavInfo,
  navInfoPropType,
  updateNavInfoActionType,
} from '../redux/redux-setup';
import type { DispatchActionPayload } from 'lib/utils/action-utils';

import * as React from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import { faEllipsisV } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { shortAbsoluteDate } from 'lib/utils/date-utils';

import css from './chat-thread-list.css';
import MessagePreview from './message-preview.react';

type Props = {|
  item: ChatThreadItem,
  active: boolean,
  navInfo: NavInfo,
  timeZone: ?string,
  dispatchActionPayload: DispatchActionPayload,
|};
type State = {|
  +menuVisible: boolean,
|};
class ChatThreadListItem extends React.PureComponent<Props, State> {
  static propTypes = {
    item: chatThreadItemPropType.isRequired,
    active: PropTypes.bool.isRequired,
    navInfo: navInfoPropType.isRequired,
    timeZone: PropTypes.string,
    dispatchActionPayload: PropTypes.func.isRequired,
  };
  state = {
    menuVisible: false,
  };

  render() {
    const { item, timeZone } = this.props;
    const lastActivity = shortAbsoluteDate(item.lastUpdatedTime, timeZone);
    const colorSplotchStyle = { backgroundColor: `#${item.threadInfo.color}` };
    const unread = item.threadInfo.currentUser.unread;
    const activeStyle = this.props.active ? css.activeThread : null;
    return (
      <div className={classNames(css.thread, activeStyle)}>
        <a className={css.threadButton} onClick={this.onClick}>
          <div className={css.threadRow}>
            <div className={css.title}>{item.threadInfo.uiName}</div>
            <div className={css.colorSplotch} style={colorSplotchStyle} />
          </div>
          <div className={css.threadRow}>
            <MessagePreview
              messageInfo={item.mostRecentMessageInfo}
              threadInfo={item.threadInfo}
            />
            <div
              className={classNames([
                css.lastActivity,
                unread ? css.black : css.dark,
              ])}
            >
              {lastActivity}
            </div>
          </div>
        </a>
        <div className={css.menu} onMouseLeave={this.hideMenu}>
          <button onClick={this.toggleMenu}>
            <FontAwesomeIcon icon={faEllipsisV} className={css.icon} />
          </button>
          <div
            className={classNames(css.menuContent, {
              [css.menuContentVisible]: this.state.menuVisible,
            })}
          >
            <ul>
              <li>
                <button>Mark as unread</button>
              </li>
              <li>
                <button>Mark as unread</button>
              </li>
              <li>
                <button>Mark as unread</button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  onClick = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.props.dispatchActionPayload(updateNavInfoActionType, {
      ...this.props.navInfo,
      activeChatThreadID: this.props.item.threadInfo.id,
    });
  };

  toggleMenu = () => {
    this.setState(state => ({ menuVisible: !state.menuVisible }));
  };

  hideMenu = () => {
    this.setState({ menuVisible: false });
  };
}

export default ChatThreadListItem;
