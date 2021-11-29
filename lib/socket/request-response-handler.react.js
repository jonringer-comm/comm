// @flow

import invariant from 'invariant';
import * as React from 'react';
import { useDispatch } from 'react-redux';

import {
  convertClientServerRequest,
  convertClientClientResponse,
} from '../shared/socket-utils';
import type { CalendarQuery } from '../types/entry-types';
import type { Dispatch } from '../types/redux-types';
import {
  processServerRequestsActionType,
  type ClientClientResponse,
  type ClientServerRequest,
} from '../types/request-types';
import {
  type ClientRequestsServerSocketMessage,
  type ClientServerSocketMessage,
  clientSocketMessageTypes,
  serverSocketMessageTypes,
  type ClientSocketMessageWithoutID,
  type SocketListener,
  type ConnectionInfo,
} from '../types/socket-types';
import { ServerError } from '../utils/errors';
import { useSelector } from '../utils/redux-utils';
import { InflightRequests, SocketTimeout } from './inflight-requests';

type BaseProps = {
  +inflightRequests: ?InflightRequests,
  +sendMessage: (message: ClientSocketMessageWithoutID) => number,
  +addListener: (listener: SocketListener) => void,
  +removeListener: (listener: SocketListener) => void,
  +getClientResponses: (
    activeServerRequests: $ReadOnlyArray<ClientServerRequest>,
  ) => $ReadOnlyArray<ClientClientResponse>,
  +currentCalendarQuery: () => CalendarQuery,
};
type Props = {
  ...BaseProps,
  +connection: ConnectionInfo,
  +dispatch: Dispatch,
};
class RequestResponseHandler extends React.PureComponent<Props> {
  componentDidMount() {
    this.props.addListener(this.onMessage);
  }

  componentWillUnmount() {
    this.props.removeListener(this.onMessage);
  }

  render() {
    return null;
  }

  onMessage = (message: ClientServerSocketMessage) => {
    if (message.type !== serverSocketMessageTypes.REQUESTS) {
      return;
    }
    const { serverRequests } = message.payload;
    if (serverRequests.length === 0) {
      return;
    }
    const serverRequestsInClientFormat = serverRequests.map(serverRequest =>
      convertClientServerRequest(serverRequest, 'server_to_client'),
    );

    const calendarQuery = this.props.currentCalendarQuery();
    this.props.dispatch({
      type: processServerRequestsActionType,
      payload: {
        serverRequests: serverRequestsInClientFormat,
        calendarQuery,
      },
    });
    if (this.props.inflightRequests) {
      const clientResponses = this.props.getClientResponses(
        serverRequestsInClientFormat,
      );
      this.sendAndHandleClientResponsesToServerRequests(clientResponses);
    }
  };

  sendClientResponses(
    clientResponses: $ReadOnlyArray<ClientClientResponse>,
  ): Promise<ClientRequestsServerSocketMessage> {
    const { inflightRequests } = this.props;
    invariant(
      inflightRequests,
      'inflightRequests falsey inside sendClientResponses',
    );
    const clientResponsesInServerFormat = clientResponses.map(response =>
      convertClientClientResponse(response, 'client_to_server'),
    );

    const messageID = this.props.sendMessage({
      type: clientSocketMessageTypes.RESPONSES,
      payload: { clientResponses: clientResponsesInServerFormat },
    });
    return inflightRequests.fetchResponse(
      messageID,
      serverSocketMessageTypes.REQUESTS,
    );
  }

  sendAndHandleClientResponsesToServerRequests(
    clientResponses: $ReadOnlyArray<ClientClientResponse>,
  ) {
    if (clientResponses.length === 0) {
      return;
    }
    const promise = this.sendClientResponses(clientResponses);
    this.handleClientResponsesToServerRequests(promise, clientResponses);
  }

  async handleClientResponsesToServerRequests(
    promise: Promise<ClientRequestsServerSocketMessage>,
    clientResponses: $ReadOnlyArray<ClientClientResponse>,
    retriesLeft: number = 1,
  ): Promise<void> {
    try {
      await promise;
    } catch (e) {
      console.log(e);
      if (
        !(e instanceof SocketTimeout) &&
        (!(e instanceof ServerError) || e.message === 'unknown_error') &&
        retriesLeft > 0 &&
        this.props.connection.status === 'connected' &&
        this.props.inflightRequests
      ) {
        // We'll only retry if the connection is healthy and the error is either
        // an unknown_error ServerError or something is neither a ServerError
        // nor a SocketTimeout.
        const newPromise = this.sendClientResponses(clientResponses);
        await this.handleClientResponsesToServerRequests(
          newPromise,
          clientResponses,
          retriesLeft - 1,
        );
      }
    }
  }
}

const ConnectedRequestResponseHandler: React.ComponentType<BaseProps> = React.memo<BaseProps>(
  function ConnectedRequestResponseHandler(props) {
    const connection = useSelector(state => state.connection);
    const dispatch = useDispatch();

    return (
      <RequestResponseHandler
        {...props}
        connection={connection}
        dispatch={dispatch}
      />
    );
  },
);
export default ConnectedRequestResponseHandler;
