// @flow

import * as React from 'react';

import { type CoreData, defaultCoreData, CoreDataContext } from './core-data';

type Props = {|
  +children: React.Node,
|};
function CoreDataProvider(props: Props) {
  const [data, setData] = React.useState<$PropertyType<CoreData, 'data'>>(
    defaultCoreData.data,
  );

  React.useEffect(() => {
    (async () => {
      const drafts = await global.CommCoreModule.getAllDrafts();
      setData((prevData) => {
        const mergedDrafts = {};
        for (const draftObj of drafts) {
          mergedDrafts[draftObj.key] = draftObj.text;
        }
        for (const key in prevData.drafts) {
          const draft = prevData.drafts[key];
          if (!draft) {
            continue;
          }
          mergedDrafts[key] = draft;
        }
        return {
          ...prevData,
          drafts: mergedDrafts,
        };
      });
    })();
  }, []);

  const updateDraft = React.useCallback(
    (draft: {| +key: string, +text: string |}) => {
      setData((prevData) => ({
        ...prevData,
        drafts: {
          ...prevData.drafts,
          [draft.key]: draft.text,
        },
      }));
      return global.CommCoreModule.updateDraft(draft);
    },
    [],
  );

  const coreData = React.useMemo(
    () => ({
      data,
      setters: { updateDraft },
    }),
    [data, updateDraft],
  );

  return (
    <CoreDataContext.Provider value={coreData}>
      {props.children}
    </CoreDataContext.Provider>
  );
}

export default CoreDataProvider;
