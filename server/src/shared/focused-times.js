// @flow

import { pingFrequency } from 'lib/shared/timeouts';

// If the time column for a given entry in the focused table has a time earlier
// than this, then that entry is considered expired, and consequently we will
// remove it from the table in the nightly cronjob.
function earliestFocusedTimeConsideredExpired(): number {
  return Date.now() - pingFrequency * 2 - 1500;
}

export { earliestFocusedTimeConsideredExpired };
