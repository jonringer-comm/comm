// @flow
import type { ConversionType } from '../types/conversion-types';
import type {
  ClientClientResponse,
  ClientServerRequest,
} from '../types/request-types';
import type { SessionState } from '../types/session-types';
import { convertCalendarQuery, convertRawEntryInfos } from './entry-utils';
import { convertThreadID, convertRawThreadInfo } from './thread-utils';

function createOpenSocketFunction(baseURL: string): () => WebSocket {
  const [protocol, address] = baseURL.split('://');
  const prefix = protocol === 'https' ? 'wss' : 'ws';
  const endpoint = `${prefix}://${address}/ws`;
  return () => new WebSocket(endpoint);
}

function convertClientClientResponse(
  response: ClientClientResponse,
  convertionType: ConversionType,
): ClientClientResponse {
  if (response.type === 6) {
    if (response.hashResults) {
      return {
        ...response,
        hashResults: convertHashes(response.hashResults, convertionType),
      };
    }
    return response;
  } else if (response.type === 7) {
    if (response.activityUpdates) {
      return {
        ...response,
        activityUpdates: response.activityUpdates.map(activityUpdate => ({
          ...activityUpdate,
          threadID: convertThreadID(activityUpdate.threadID, convertionType),
        })),
      };
    }
  }
  return response;
}

function convertClientServerRequest(
  request: ClientServerRequest,
  conversionType: ConversionType,
): ClientServerRequest {
  const result = { ...request };
  if (result.hashesToCheck) {
    result.hashesToCheck = convertHashes(result.hashesToCheck, conversionType);
  }
  if (result.stateChanges) {
    const stateChanges = { ...result.stateChanges };
    if (stateChanges.rawEntryInfos) {
      stateChanges.rawEntryInfos = [
        ...convertRawEntryInfos(stateChanges.rawEntryInfos, conversionType),
      ];
    }
    if (stateChanges.rawThreadInfos) {
      stateChanges.rawThreadInfos = stateChanges.rawThreadInfos.map(
        rawThreadInfo => convertRawThreadInfo(rawThreadInfo, conversionType),
      );
    }
    if (stateChanges.deleteThreadIDs) {
      stateChanges.deleteThreadIDs = stateChanges.deleteThreadIDs.map(
        threadID => convertThreadID(threadID, conversionType),
      );
    }
    result.stateChanges = stateChanges;
  }
  return result;
}

function convertHashes<T>(
  hashes: {
    +[key: string]: T,
  },
  conversionType: ConversionType,
): { +[key: string]: T } {
  const result: { [key: string]: T } = {};
  Object.keys(hashes).forEach(key => {
    if (key.startsWith('threadInfo|')) {
      const threadID = key.substr(key.indexOf('|') + 1);
      result[`threadInfo|${convertThreadID(threadID, conversionType)}`] =
        hashes[key];
    } else {
      result[key] = hashes[key];
    }
  });
  return result;
}

function convertSessionState(
  state: SessionState,
  conversionType: ConversionType,
): SessionState {
  return {
    ...state,
    calendarQuery: convertCalendarQuery(state.calendarQuery, conversionType),
    watchedIDs: state.watchedIDs.map(threadID =>
      convertThreadID(threadID, conversionType),
    ),
  };
}

export {
  createOpenSocketFunction,
  convertHashes,
  convertSessionState,
  convertClientClientResponse,
  convertClientServerRequest,
};
