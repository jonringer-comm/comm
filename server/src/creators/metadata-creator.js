// @flow

import { dbQuery, SQL } from '../database/database';

async function createMetadata() {
  const initializeDbVersion = SQL`
    INSERT INTO metadata (col_name, num_val)
    VALUES
      ('db_version', 0);
    `;
  await dbQuery(initializeDbVersion);
}

export default createMetadata;
