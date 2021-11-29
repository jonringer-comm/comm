// @flow

import {
  convertCalendarQuery,
  convertRawEntryInfos,
  convertCreateEntryPayload,
  convertHistoryRevisionInfos,
} from '../shared/entry-utils';
import { localIDPrefix, convertRawMessageInfos } from '../shared/message-utils';
import { convertThreadID } from '../shared/thread-utils';
import { convertClientCreateUpdatesResponse } from '../shared/update-utils';
import type {
  RawEntryInfo,
  CalendarQuery,
  SaveEntryInfo,
  SaveEntryResult,
  CreateEntryInfo,
  CreateEntryPayload,
  DeleteEntryInfo,
  DeleteEntryResult,
  RestoreEntryInfo,
  RestoreEntryResult,
  FetchEntryInfosResult,
  CalendarQueryUpdateResult,
} from '../types/entry-types';
import type { HistoryRevisionInfo } from '../types/history-types';
import { dateFromString } from '../utils/date-utils';
import type { FetchJSON } from '../utils/fetch-json';

const fetchEntriesActionTypes = Object.freeze({
  started: 'FETCH_ENTRIES_STARTED',
  success: 'FETCH_ENTRIES_SUCCESS',
  failed: 'FETCH_ENTRIES_FAILED',
});
const fetchEntries = (
  fetchJSON: FetchJSON,
): ((
  calendarQuery: CalendarQuery,
) => Promise<FetchEntryInfosResult>) => async calendarQuery => {
  const serverCalendarQuery = convertCalendarQuery(
    calendarQuery,
    'client_to_server',
  );
  const response = await fetchJSON('fetch_entries', serverCalendarQuery);
  return {
    rawEntryInfos: convertRawEntryInfos(
      response.rawEntryInfos,
      'server_to_client',
    ),
  };
};

const updateCalendarQueryActionTypes = Object.freeze({
  started: 'UPDATE_CALENDAR_QUERY_STARTED',
  success: 'UPDATE_CALENDAR_QUERY_SUCCESS',
  failed: 'UPDATE_CALENDAR_QUERY_FAILED',
});
const updateCalendarQuery = (
  fetchJSON: FetchJSON,
): ((
  calendarQuery: CalendarQuery,
  reduxAlreadyUpdated?: boolean,
) => Promise<CalendarQueryUpdateResult>) => async (
  calendarQuery,
  reduxAlreadyUpdated = false,
) => {
  const serverCalendarQuery = convertCalendarQuery(
    calendarQuery,
    'client_to_server',
  );
  const response = await fetchJSON(
    'update_calendar_query',
    serverCalendarQuery,
  );
  const { rawEntryInfos, deletedEntryIDs } = response;
  return {
    rawEntryInfos: convertRawEntryInfos(rawEntryInfos, 'server_to_client'),
    deletedEntryIDs,
    calendarQuery,
    calendarQueryAlreadyUpdated: reduxAlreadyUpdated,
  };
};

const createLocalEntryActionType = 'CREATE_LOCAL_ENTRY';
function createLocalEntry(
  threadID: string,
  localID: number,
  dateString: string,
  creatorID: string,
): RawEntryInfo {
  const date = dateFromString(dateString);
  const newEntryInfo: RawEntryInfo = {
    localID: `${localIDPrefix}${localID}`,
    threadID,
    text: '',
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    creationTime: Date.now(),
    creatorID,
    deleted: false,
  };
  return newEntryInfo;
}

const createEntryActionTypes = Object.freeze({
  started: 'CREATE_ENTRY_STARTED',
  success: 'CREATE_ENTRY_SUCCESS',
  failed: 'CREATE_ENTRY_FAILED',
});
const createEntry = (
  fetchJSON: FetchJSON,
): ((
  request: CreateEntryInfo,
) => Promise<CreateEntryPayload>) => async request => {
  const serverThreadID = convertThreadID(request.threadID, 'client_to_server');
  const serverRequest: CreateEntryInfo = {
    ...request,
    threadID: serverThreadID,
  };
  const serverResult = await fetchJSON('create_entry', serverRequest);
  return convertCreateEntryPayload(
    {
      entryID: serverResult.entryID,
      newMessageInfos: serverResult.newMessageInfos,
      threadID: serverThreadID,
      localID: request.localID,
      updatesResult: serverResult.updatesResult,
    },
    'server_to_client',
  );
};

const saveEntryActionTypes = Object.freeze({
  started: 'SAVE_ENTRY_STARTED',
  success: 'SAVE_ENTRY_SUCCESS',
  failed: 'SAVE_ENTRY_FAILED',
});
const concurrentModificationResetActionType = 'CONCURRENT_MODIFICATION_RESET';
const saveEntry = (
  fetchJSON: FetchJSON,
): ((request: SaveEntryInfo) => Promise<SaveEntryResult>) => async request => {
  const serverRequest = {
    ...request,
    calendarQuery: convertCalendarQuery(
      request.calendarQuery,
      'client_to_server',
    ),
  };
  const serverResult = await fetchJSON('update_entry', serverRequest);
  return {
    entryID: serverResult.entryID,
    newMessageInfos: convertRawMessageInfos(
      serverResult.newMessageInfos,
      'server_to_client',
    ),
    updatesResult: convertClientCreateUpdatesResponse(
      serverResult.updatesResult,
      'server_to_client',
    ),
  };
};

const deleteEntryActionTypes = Object.freeze({
  started: 'DELETE_ENTRY_STARTED',
  success: 'DELETE_ENTRY_SUCCESS',
  failed: 'DELETE_ENTRY_FAILED',
});
const deleteEntry = (
  fetchJSON: FetchJSON,
): ((info: DeleteEntryInfo) => Promise<DeleteEntryResult>) => async info => {
  const response = await fetchJSON('delete_entry', {
    ...info,
    calendarQuery: convertCalendarQuery(info.calendarQuery, 'client_to_server'),
    timestamp: Date.now(),
  });
  return {
    threadID: convertThreadID(response.threadID, 'server_to_client'),
    newMessageInfos: convertRawMessageInfos(
      response.newMessageInfos,
      'server_to_client',
    ),
    updatesResult: convertClientCreateUpdatesResponse(
      response.updatesResult,
      'server_to_client',
    ),
  };
};

const fetchRevisionsForEntryActionTypes = Object.freeze({
  started: 'FETCH_REVISIONS_FOR_ENTRY_STARTED',
  success: 'FETCH_REVISIONS_FOR_ENTRY_SUCCESS',
  failed: 'FETCH_REVISIONS_FOR_ENTRY_FAILED',
});
const fetchRevisionsForEntry = (
  fetchJSON: FetchJSON,
): ((
  entryID: string,
) => Promise<$ReadOnlyArray<HistoryRevisionInfo>>) => async entryID => {
  const response = await fetchJSON('fetch_entry_revisions', { id: entryID });
  return convertHistoryRevisionInfos(response.result, 'server_to_client');
};

const restoreEntryActionTypes = Object.freeze({
  started: 'RESTORE_ENTRY_STARTED',
  success: 'RESTORE_ENTRY_SUCCESS',
  failed: 'RESTORE_ENTRY_FAILED',
});
const restoreEntry = (
  fetchJSON: FetchJSON,
): ((info: RestoreEntryInfo) => Promise<RestoreEntryResult>) => async info => {
  const response = await fetchJSON('restore_entry', {
    ...info,
    calendarQuery: convertCalendarQuery(info.calendarQuery, 'client_to_server'),
    timestamp: Date.now(),
  });
  return {
    newMessageInfos: convertRawMessageInfos(
      response.newMessageInfos,
      'server_to_client',
    ),
    updatesResult: convertClientCreateUpdatesResponse(
      response.updatesResult,
      'server_to_client',
    ),
  };
};

export {
  fetchEntriesActionTypes,
  fetchEntries,
  updateCalendarQueryActionTypes,
  updateCalendarQuery,
  createLocalEntryActionType,
  createLocalEntry,
  createEntryActionTypes,
  createEntry,
  saveEntryActionTypes,
  concurrentModificationResetActionType,
  saveEntry,
  deleteEntryActionTypes,
  deleteEntry,
  fetchRevisionsForEntryActionTypes,
  fetchRevisionsForEntry,
  restoreEntryActionTypes,
  restoreEntry,
};
