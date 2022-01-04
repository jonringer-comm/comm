// @flow

import { dbQuery, SQL } from './database';

const migrations: $ReadOnlyMap<number, () => Promise<void>> = new Map([]);

async function createDbVersionEntry() {
  const insertQuery = SQL`
    INSERT INTO metadata (name,data)
    SELECT *
    FROM (
      SELECT 'db_version' AS name,
      0 AS data
      )
    AS TEMP
    WHERE NOT EXISTS (
	    SELECT name
      FROM metadata
      WHERE name = 'db_version'
	  ) LIMIT 1
    `;
  await dbQuery(insertQuery);
}

async function getDbVersion() {
  const versionQuery = SQL`
    SELECT data
    FROM metadata
    WHERE name = 'db_version';
  `;
  const [[versionResult]] = await dbQuery(versionQuery);
  const dbVersion = versionResult.data;
  console.log(`(node:${process.pid}) db schema version: ${dbVersion}`);
  return dbVersion;
}

async function updateDbVersion(dbVersion: number) {
  const updateQuery = SQL`
    UPDATE metadata
    SET data = ${dbVersion}
    WHERE name = 'db_version';
      `;
  await dbQuery(updateQuery);
}

async function migrate(): Promise<boolean> {
  let didMigrationsSucceed = false;

  await createDbVersionEntry();
  const dbVersion = await getDbVersion();

  for (const [idx, value] of migrations.entries()) {
    if (idx <= dbVersion) {
      continue;
    }

    const turnOffAutocommit = SQL`
      SET autocommit = 0;
    `;
    await dbQuery(turnOffAutocommit);
    const beginTransaction = SQL`
      START TRANSACTION
      `;
    await dbQuery(beginTransaction);

    try {
      await value();
    } catch (e) {
      console.error(`(node:${process.pid}) migration ${idx} failed.`);
      console.error(e);
      const rollbackTransaction = SQL`
            ROLLBACK
        `;
      await dbQuery(rollbackTransaction);
      return didMigrationsSucceed;
    }

    await updateDbVersion(idx);
    const endTransaction = SQL`
      COMMIT
    `;
    await dbQuery(endTransaction);
    console.log(`(node:${process.pid}) migration ${idx} succeeded.`);

    const turnOnAutocommit = SQL`
      SET autocommit = 1;
    `;
    await dbQuery(turnOnAutocommit);
  }
  return (didMigrationsSucceed = true);
}

export default migrate;
