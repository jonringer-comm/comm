// @flow

import type { Viewer } from '../session/viewer';
import {
  type FetchErrorReportInfosResponse,
  type FetchErrorReportInfosRequest,
  type ReduxToolsImport,
  reportTypes,
} from 'lib/types/report-types';

import { ServerError } from 'lib/utils/errors';
import { isStaff } from 'lib/shared/user-utils';
import { values } from 'lib/utils/objects';

import { dbQuery, SQL } from '../database';

async function fetchErrorReportInfos(
  viewer: Viewer,
  request: FetchErrorReportInfosRequest,
): Promise<FetchErrorReportInfosResponse> {
  if (!viewer.loggedIn || !isStaff(viewer.userID)) {
    throw new ServerError('invalid_credentials');
  }

  const query = SQL`
    SELECT r.id, r.user, r.platform, r.report, r.creation_time, u.username
    FROM reports r
    LEFT JOIN users u ON u.id = r.user
  `;
  if (request.cursor) {
    query.append(SQL`WHERE r.id < ${request.cursor} `);
  }
  query.append(SQL`ORDER BY r.id DESC`);
  const [result] = await dbQuery(query);

  const reports = [];
  const userInfos = {};
  for (let row of result) {
    const viewerID = row.user.toString();
    let { platformDetails } = row.report;
    if (!platformDetails) {
      platformDetails = {
        platform: row.platform,
        codeVersion: row.report.codeVersion,
        stateVersion: row.report.stateVersion,
      };
    }
    reports.push({
      id: row.id.toString(),
      viewerID,
      platformDetails,
      creationTime: row.creation_time,
    });
    if (row.username) {
      userInfos[viewerID] = {
        id: viewerID,
        username: row.username,
      };
    }
  }

  return { reports, userInfos: values(userInfos) };
}

async function fetchReduxToolsImport(
  viewer: Viewer,
  id: string,
): Promise<ReduxToolsImport> {
  if (!viewer.loggedIn || !isStaff(viewer.userID)) {
    throw new ServerError('invalid_credentials');
  }

  const query = SQL`
    SELECT user, report, creation_time
    FROM reports
    WHERE id = ${id} AND type = ${reportTypes.ERROR}
  `;
  const [result] = await dbQuery(query);
  if (result.length === 0) {
    throw new ServerError('invalid_parameters');
  }
  const row = result[0];

  const _persist = row.report.preloadedState._persist
    ? row.report.preloadedState._persist
    : {};
  const navState =
    row.report.currentState && row.report.currentState.navState
      ? row.report.currentState.navState
      : undefined;
  return {
    preloadedState: {
      ...row.report.preloadedState,
      _persist: {
        ..._persist,
        // Setting this to false disables redux-persist
        rehydrated: false,
      },
      navState,
      frozen: true,
    },
    payload: row.report.actions,
  };
}

export { fetchErrorReportInfos, fetchReduxToolsImport };
