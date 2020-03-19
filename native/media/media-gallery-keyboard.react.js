// @flow

import type { AppState } from '../redux/redux-setup';
import {
  type Dimensions,
  dimensionsPropType,
  type MediaLibrarySelection,
} from 'lib/types/media-types';
import type { ViewToken } from 'react-native/Libraries/Lists/ViewabilityHelper';
import type { ViewStyle, Styles } from '../types/styles';
import { type Colors, colorsPropType } from '../themes/colors';

import * as React from 'react';
import {
  View,
  Text,
  Platform,
  PermissionsAndroid,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { KeyboardRegistry } from 'react-native-keyboard-input';
import invariant from 'invariant';
import { Provider } from 'react-redux';
import CameraRoll from '@react-native-community/cameraroll';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';
import {
  mimeTypesToMediaTypes,
  extensionFromFilename,
} from 'lib/utils/file-utils';

import { store } from '../redux/redux-setup';
import {
  dimensionsSelector,
  contentBottomOffset,
} from '../selectors/dimension-selectors';
import MediaGalleryMedia from './media-gallery-media.react';
import Animated, { Easing } from 'react-native-reanimated';
import { colorsSelector, styleSelector } from '../themes/colors';
import { getAndroidPermission } from '../utils/android-permissions';
import SendMediaButton from './send-media-button.react';
import { getCompatibleMediaURI } from '../utils/media-utils';

const animationSpec = {
  duration: 400,
  easing: Easing.inOut(Easing.ease),
};

type Props = {|
  // Redux state
  screenDimensions: Dimensions,
  foreground: boolean,
  colors: Colors,
  styles: Styles,
|};
type State = {|
  selections: ?$ReadOnlyArray<MediaLibrarySelection>,
  error: ?string,
  containerHeight: ?number,
  // null means end reached; undefined means no fetch yet
  cursor: ?string,
  queuedMediaURIs: ?Set<string>,
  focusedMediaURI: ?string,
  screenWidth: number,
|};
class MediaGalleryKeyboard extends React.PureComponent<Props, State> {
  static propTypes = {
    screenDimensions: dimensionsPropType.isRequired,
    foreground: PropTypes.bool.isRequired,
    colors: colorsPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
  };
  mounted = false;
  fetchingPhotos = false;
  flatList: ?FlatList;
  viewableIndices: number[] = [];
  queueModeProgress = new Animated.Value(0);
  sendButtonStyle: ViewStyle;
  mediaSelected = false;

  constructor(props: Props) {
    super(props);
    const sendButtonScale = Animated.interpolate(this.queueModeProgress, {
      inputRange: [0, 1],
      outputRange: [1.3, 1],
    });
    this.sendButtonStyle = {
      opacity: this.queueModeProgress,
      transform: [{ scale: sendButtonScale }],
    };
    this.state = {
      selections: null,
      error: null,
      containerHeight: null,
      cursor: undefined,
      queuedMediaURIs: null,
      focusedMediaURI: null,
      screenWidth: props.screenDimensions.width,
    };
  }

  componentDidMount() {
    this.mounted = true;
    return this.fetchPhotos();
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const { width } = this.props.screenDimensions;
    if (width !== prevProps.screenDimensions.width) {
      // We keep screenWidth in this.state since that's what we pass in as
      // FlatList's extraData
      this.setState({ screenWidth: width });
    }

    const { queuedMediaURIs } = this.state;
    const prevQueuedMediaURIs = prevState.queuedMediaURIs;
    if (queuedMediaURIs && !prevQueuedMediaURIs) {
      Animated.timing(this.queueModeProgress, {
        ...animationSpec,
        toValue: 1,
      }).start();
    } else if (!queuedMediaURIs && prevQueuedMediaURIs) {
      Animated.timing(this.queueModeProgress, {
        ...animationSpec,
        toValue: 0,
      }).start();
    }

    const { flatList, viewableIndices } = this;
    const { selections, focusedMediaURI } = this.state;
    let scrollingSomewhere = false;
    if (flatList && selections) {
      let newURI;
      if (focusedMediaURI && focusedMediaURI !== prevState.focusedMediaURI) {
        newURI = focusedMediaURI;
      } else if (
        queuedMediaURIs &&
        (!prevQueuedMediaURIs ||
          queuedMediaURIs.size > prevQueuedMediaURIs.size)
      ) {
        for (let queuedMediaURI of queuedMediaURIs) {
          if (prevQueuedMediaURIs && prevQueuedMediaURIs.has(queuedMediaURI)) {
            continue;
          }
          newURI = queuedMediaURI;
          break;
        }
      }
      let index;
      if (newURI !== null && newURI !== undefined) {
        index = selections.findIndex(({ uri }) => uri === newURI);
      }
      if (index !== null && index !== undefined) {
        if (index === viewableIndices[0]) {
          scrollingSomewhere = true;
          flatList.scrollToIndex({ index });
        } else if (index === viewableIndices[viewableIndices.length - 1]) {
          scrollingSomewhere = true;
          flatList.scrollToIndex({ index, viewPosition: 1 });
        }
      }
    }

    if (this.props.foreground && !prevProps.foreground) {
      this.fetchPhotos();
    }

    if (
      !scrollingSomewhere &&
      this.flatList &&
      this.state.selections &&
      prevState.selections &&
      this.state.selections.length > 0 &&
      prevState.selections.length > 0 &&
      this.state.selections[0].uri !== prevState.selections[0].uri
    ) {
      this.flatList.scrollToIndex({ index: 0 });
    }
  }

  guardedSetState(change) {
    if (this.mounted) {
      this.setState(change);
    }
  }

  static getPhotosQuery(after: ?string) {
    const base = {};
    base.first = 20;
    base.assetType = 'All';
    if (Platform.OS !== 'android') {
      base.groupTypes = 'All';
    }
    if (after) {
      base.after = after;
    }
    base.mimeTypes = Object.keys(mimeTypesToMediaTypes);
    return base;
  }

  static compatibleURI(uri: string, filename: string) {
    const extension = extensionFromFilename(filename);
    if (!extension) {
      return uri;
    }
    return getCompatibleMediaURI(uri, extension);
  }

  async fetchPhotos(after?: ?string) {
    if (this.fetchingPhotos) {
      return;
    }
    this.fetchingPhotos = true;
    try {
      if (Platform.OS === 'android') {
        const hasPermission = await this.getAndroidPermissions();
        if (!hasPermission) {
          return;
        }
      }
      const { edges, page_info } = await CameraRoll.getPhotos(
        MediaGalleryKeyboard.getPhotosQuery(after),
      );

      let firstRemoved = false,
        lastRemoved = false;

      const mediaURIs = this.state.selections
        ? this.state.selections.map(({ uri }) => uri)
        : [];
      const existingURIs = new Set(mediaURIs);
      let first = true;
      const selections = edges
        .map(({ node }) => {
          const { height, width, filename, playableDuration } = node.image;
          const isVideo =
            (Platform.OS === 'android' &&
              playableDuration !== null &&
              playableDuration !== undefined) ||
            (Platform.OS === 'ios' && node.type === 'video');
          const uri = isVideo
            ? MediaGalleryKeyboard.compatibleURI(node.image.uri, filename)
            : node.image.uri;

          if (existingURIs.has(uri)) {
            if (first) {
              firstRemoved = true;
            }
            lastRemoved = true;
            first = false;
            return null;
          }
          first = false;
          lastRemoved = false;
          existingURIs.add(uri);

          if (isVideo) {
            return {
              step: 'video_library',
              dimensions: { height, width },
              uri,
              filename,
              playableDuration,
            };
          } else {
            return {
              step: 'photo_library',
              dimensions: { height, width },
              uri,
              filename,
            };
          }
        })
        .filter(Boolean);

      let appendOrPrepend = after ? 'append' : 'prepend';
      if (firstRemoved && !lastRemoved) {
        appendOrPrepend = 'append';
      } else if (!firstRemoved && lastRemoved) {
        appendOrPrepend = 'prepend';
      }

      let newSelections = selections;
      if (this.state.selections) {
        if (appendOrPrepend === 'prepend') {
          newSelections = [...newSelections, ...this.state.selections];
        } else {
          newSelections = [...this.state.selections, ...newSelections];
        }
      }

      this.guardedSetState({
        selections: newSelections,
        error: null,
        cursor: page_info.has_next_page ? page_info.end_cursor : null,
      });
    } catch (e) {
      this.guardedSetState({
        selections: null,
        error: 'something went wrong :(',
      });
    }
    this.fetchingPhotos = false;
  }

  async getAndroidPermissions(): Promise<boolean> {
    const granted = await getAndroidPermission(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      {
        title: 'Access Your Photos',
        message: 'Requesting access to your external storage',
      },
    );
    if (!granted) {
      this.guardedSetState({ error: "don't have permission :(" });
    }
    return granted;
  }

  get queueModeActive() {
    return !!this.state.queuedMediaURIs;
  }

  renderItem = (row: { item: MediaLibrarySelection }) => {
    const { containerHeight, queuedMediaURIs } = this.state;
    invariant(containerHeight, 'should be set');
    const { uri } = row.item;
    const isQueued = !!(queuedMediaURIs && queuedMediaURIs.has(uri));
    const { queueModeActive } = this;
    return (
      <MediaGalleryMedia
        selection={row.item}
        containerHeight={containerHeight}
        queueModeActive={queueModeActive}
        isQueued={isQueued}
        setMediaQueued={this.setMediaQueued}
        sendMedia={this.sendSingleMedia}
        isFocused={this.state.focusedMediaURI === uri}
        setFocus={this.setFocus}
        screenWidth={this.state.screenWidth}
        colors={this.props.colors}
      />
    );
  };

  ItemSeparator = () => {
    return <View style={this.props.styles.separator} />;
  };

  static keyExtractor(item: MediaLibrarySelection) {
    return item.uri;
  }

  render() {
    let content;
    const { selections, error, containerHeight } = this.state;
    if (selections && selections.length > 0 && containerHeight) {
      content = (
        <FlatList
          horizontal={true}
          data={selections}
          renderItem={this.renderItem}
          ItemSeparatorComponent={this.ItemSeparator}
          keyExtractor={MediaGalleryKeyboard.keyExtractor}
          scrollsToTop={false}
          showsHorizontalScrollIndicator={false}
          onEndReached={this.onEndReached}
          onEndReachedThreshold={5}
          onViewableItemsChanged={this.onViewableItemsChanged}
          extraData={this.state}
          ref={this.flatListRef}
        />
      );
    } else if (selections && containerHeight) {
      content = (
        <Text style={this.props.styles.error}>no media was found!</Text>
      );
    } else if (error) {
      content = <Text style={this.props.styles.error}>{error}</Text>;
    } else {
      content = (
        <ActivityIndicator
          color={this.props.colors.listSeparatorLabel}
          size="large"
          style={this.props.styles.loadingIndicator}
        />
      );
    }

    const { queuedMediaURIs } = this.state;
    const queueCount = queuedMediaURIs ? queuedMediaURIs.size : 0;
    return (
      <View
        style={this.props.styles.container}
        onLayout={this.onContainerLayout}
      >
        {content}
        <SendMediaButton
          onPress={this.sendQueuedMedia}
          queueCount={queueCount}
          pointerEvents={queuedMediaURIs ? 'auto' : 'none'}
          containerStyle={this.props.styles.sendButtonContainer}
          style={this.sendButtonStyle}
        />
      </View>
    );
  }

  flatListRef = (flatList: ?FlatList) => {
    this.flatList = flatList;
  };

  onContainerLayout = (event: {
    nativeEvent: { layout: { height: number } },
  }) => {
    this.guardedSetState({ containerHeight: event.nativeEvent.layout.height });
  };

  onEndReached = () => {
    const { cursor } = this.state;
    if (cursor !== null) {
      this.fetchPhotos(cursor);
    }
  };

  onViewableItemsChanged = (info: {
    viewableItems: ViewToken[],
    changed: ViewToken[],
  }) => {
    const viewableIndices = [];
    for (let { index } of info.viewableItems) {
      if (index !== null && index !== undefined) {
        viewableIndices.push(index);
      }
    }
    this.viewableIndices = viewableIndices;
  };

  setMediaQueued = (selection: MediaLibrarySelection, isQueued: boolean) => {
    this.setState((prevState: State) => {
      const prevQueuedMediaURIs = prevState.queuedMediaURIs
        ? [...prevState.queuedMediaURIs]
        : [];
      if (isQueued) {
        return {
          queuedMediaURIs: new Set([...prevQueuedMediaURIs, selection.uri]),
          focusedMediaURI: null,
        };
      }
      const queuedMediaURIs = prevQueuedMediaURIs.filter(
        uri => uri !== selection.uri,
      );
      if (queuedMediaURIs.length < prevQueuedMediaURIs.length) {
        return {
          queuedMediaURIs: new Set(queuedMediaURIs),
          focusedMediaURI: null,
        };
      }
      return null;
    });
  };

  setFocus = (selection: MediaLibrarySelection, isFocused: boolean) => {
    const { uri } = selection;
    if (isFocused) {
      this.setState({ focusedMediaURI: uri });
    } else if (this.state.focusedMediaURI === uri) {
      this.setState({ focusedMediaURI: null });
    }
  };

  sendSingleMedia = (selection: MediaLibrarySelection) => {
    this.sendMedia([selection]);
  };

  sendQueuedMedia = () => {
    const { selections, queuedMediaURIs } = this.state;
    if (!selections || !queuedMediaURIs) {
      return;
    }
    const queuedSelections = [];
    for (let uri of queuedMediaURIs) {
      for (let selection of selections) {
        if (selection.uri === uri) {
          queuedSelections.push(selection);
          break;
        }
      }
    }
    this.sendMedia(queuedSelections);
  };

  sendMedia(selections: $ReadOnlyArray<MediaLibrarySelection>) {
    if (this.mediaSelected) {
      return;
    }
    this.mediaSelected = true;
    KeyboardRegistry.onItemSelected(mediaGalleryKeyboardName, selections);
  }
}

const mediaGalleryKeyboardName = 'MediaGalleryKeyboard';

const styles = {
  container: {
    position: 'absolute',
    top: 0,
    bottom: -contentBottomOffset,
    left: 0,
    right: 0,
    backgroundColor: 'listBackground',
    flexDirection: 'row',
    alignItems: 'center',
  },
  error: {
    flex: 1,
    fontSize: 28,
    textAlign: 'center',
    marginBottom: contentBottomOffset,
    color: 'listBackgroundLabel',
  },
  separator: {
    width: 2,
  },
  loadingIndicator: {
    flex: 1,
    marginBottom: contentBottomOffset,
  },
  sendButtonContainer: {
    position: 'absolute',
    bottom: 30,
    right: 30,
  },
};
const stylesSelector = styleSelector(styles);

const ReduxConnectedMediaGalleryKeyboard = connect((state: AppState) => ({
  screenDimensions: dimensionsSelector(state),
  foreground: state.foreground,
  colors: colorsSelector(state),
  styles: stylesSelector(state),
}))(MediaGalleryKeyboard);

function ReduxMediaGalleryKeyboard(props: {||}) {
  return (
    <Provider store={store}>
      <ReduxConnectedMediaGalleryKeyboard />
    </Provider>
  );
}

KeyboardRegistry.registerKeyboard(
  mediaGalleryKeyboardName,
  () => ReduxMediaGalleryKeyboard,
);

export { mediaGalleryKeyboardName };
