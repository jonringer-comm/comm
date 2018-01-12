// @flow

import type { Connection } from '../database';

import apn from 'apn';
import fcmAdmin from 'firebase-admin';

import { SQL } from '../database';
import apnConfig from '../../secrets/apn_config';
import fcmConfig from '../../secrets/fcm_config';

const apnProvider = new apn.Provider(apnConfig);
fcmAdmin.initializeApp({
  credential: fcmAdmin.credential.cert(fcmConfig),
});

async function apnPush(
  notification: apn.Notification,
  deviceTokens: string[],
  dbID: string,
) {
  const result = await apnProvider.send(notification, deviceTokens);
  const errors = [];
  for (let failure of result.failed) {
    errors.push(failure);
  }
  if (errors.length > 0) {
    return { errors, dbID };
  }
  return { success: true, dbID };
}

async function fcmPush(
  notification: Object,
  deviceTokens: string[],
  dbID: string,
) {
  try {
    const deliveryResult = await fcmAdmin.messaging().sendToDevice(
      deviceTokens,
      notification,
    );
    const errors = [];
    const ids = [];
    for (let fcmResult of deliveryResult.results) {
      if (fcmResult.error) {
        errors.push(fcmResult.error);
      } else if (fcmResult.messageId) {
        ids.push(fcmResult.messageId);
      }
    }
    const result: Object = { dbID };
    if (ids.length > 0) {
      result.fcmIDs = ids;
    }
    if (errors.length > 0) {
      result.errors = errors;
    } else {
      result.success = true;
    }
    return result;
  } catch (e) {
    return { errors: [ e ], dbID };
  }
}

async function getUnreadCounts(
  conn: Connection,
  userIDs: string[],
): Promise<{ [userID: string]: number }> {
  const query = SQL`
    SELECT user, COUNT(thread) AS unread_count
    FROM memberships
    WHERE user IN (${userIDs}) AND unread = 1 AND role != 0
    GROUP BY user
  `;
  const [ result ] = await conn.query(query);
  const usersToUnreadCounts = {};
  for (let row of result) {
    usersToUnreadCounts[row.user.toString()] = row.unread_count;
  }
  for (let userID of userIDs) {
    if (usersToUnreadCounts[userID] === undefined) {
      usersToUnreadCounts[userID] = 0;
    }
  }
  return usersToUnreadCounts;
}

export {
  apnPush,
  fcmPush,
  getUnreadCounts,
}
