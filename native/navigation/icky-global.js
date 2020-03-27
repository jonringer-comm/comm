// @flow

import type { NavContextType } from './navigation-context';

let globalNavContext: ?NavContextType = null;

function setGlobalNavContext(navContext: ?NavContextType) {
  globalNavContext = navContext;
}

function getGlobalNavContext(): ?NavContextType {
  return globalNavContext;
}

export { setGlobalNavContext, getGlobalNavContext };
