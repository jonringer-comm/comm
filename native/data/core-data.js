// @flow

import * as React from 'react';

export type CoreData = {|
  +data: {|
    +drafts: { +[key: string]: string },
  |},
  +setters: {|
    +updateDraft: (draft: {| +key: string, +text: string |}) => boolean,
  |},
|};

const defaultCoreData = Object.freeze({
  data: {
    drafts: {},
  },
  setters: {
    updateDraft: global.CommCoreModule.updateDraft,
  },
});

const CoreDataContext = React.createContext<CoreData>(defaultCoreData);

export { defaultCoreData, CoreDataContext };
