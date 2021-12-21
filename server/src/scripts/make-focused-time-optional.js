// @flow

import { dbQuery, SQL } from '../database/database';
import { main } from './utils';

async function makeFocusedTimeOptional() {
  await dbQuery(SQL`
    ALTER TABLE focused
    CHANGE time time BIGINT(20) NULL
  `);
}

main([makeFocusedTimeOptional]);
