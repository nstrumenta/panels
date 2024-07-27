// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import CloseIcon from '@mui/icons-material/Close';
import { Dialog, IconButton } from '@mui/material';
import { useCallback } from 'react';
import { makeStyles } from 'tss-react/mui';

import Stack from '@base/components/Stack';
import { useAnalytics } from '@base/context/AnalyticsContext';
import {
  WorkspaceContextStore,
  useWorkspaceActions,
  useWorkspaceStore,
} from '@base/context/WorkspaceContext';
import { AppEvent } from '@base/services/IAnalytics';

import StartNstrumenta from './StartNstrumenta';

const DataSourceDialogItems = ['nstrumenta'] as const;
export type DataSourceDialogItem = (typeof DataSourceDialogItems)[number];

const useStyles = makeStyles()((theme) => ({
  paper: {
    maxWidth: `calc(min(${theme.breakpoints.values.md}px, 100% - ${theme.spacing(4)}))`,
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    margin: theme.spacing(3),
  },
}));

const selectDataSourceDialog = (store: WorkspaceContextStore) => store.dataSourceDialog;

export function DataSourceDialog(): JSX.Element {
  const { classes } = useStyles();
  const { dataSourceDialogActions } = useWorkspaceActions();
  const { activeDataSource } = useWorkspaceStore(selectDataSourceDialog);

  const analytics = useAnalytics();

  const onModalClose = useCallback(() => {
    void analytics.logEvent(AppEvent.DIALOG_CLOSE, { activeDataSource });
    dataSourceDialogActions.close();
  }, [dataSourceDialogActions, analytics, activeDataSource]);

  return (
    <Dialog
      open
      onClose={onModalClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{
        square: false,
        elevation: 4,
        className: classes.paper,
      }}
    >
      <IconButton className={classes.closeButton} onClick={onModalClose} edge="end">
        <CloseIcon />
      </IconButton>
      <Stack flexGrow={1} fullHeight justifyContent="space-between" overflow={'hidden'}>
        <StartNstrumenta />,
      </Stack>
    </Dialog>
  );
}
