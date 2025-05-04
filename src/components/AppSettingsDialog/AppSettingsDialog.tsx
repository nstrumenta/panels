// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import CloseIcon from '@mui/icons-material/Close';
import {
  Button,
  Dialog,
  DialogActions,
  DialogProps,
  IconButton,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { MouseEvent, SyntheticEvent, useState } from 'react';
import { makeStyles } from 'tss-react/mui';

import Stack from '@base/components/Stack';
import { WorkspaceContextStore, useWorkspaceStore } from '@base/context/WorkspaceContext';

import { ColorSchemeSettings, MessageFramerate, TimeFormat, TimezoneSettings } from './settings';

const useStyles = makeStyles()((theme) => ({
  layoutGrid: {
    display: 'grid',
    gap: theme.spacing(2),
    height: '70vh',
    paddingLeft: theme.spacing(1),
    overflowY: 'hidden',
    [theme.breakpoints.up('sm')]: {
      gridTemplateColumns: 'auto minmax(0, 1fr)',
    },
  },
  logo: {
    width: 212,
    height: 'auto',
    marginLeft: theme.spacing(-1),
  },
  tabPanel: {
    display: 'none',
    marginRight: '-100%',
    width: '100%',
    padding: theme.spacing(0, 4, 4),
  },
  tabPanelActive: {
    display: 'block',
  },
  checkbox: {
    '&.MuiCheckbox-root': {
      paddingTop: 0,
    },
  },
  dialogActions: {
    position: 'sticky',
    backgroundColor: theme.palette.background.paper,
    borderTop: `${theme.palette.divider} 1px solid`,
    padding: theme.spacing(1),
    bottom: 0,
  },
  formControlLabel: {
    '&.MuiFormControlLabel-root': {
      alignItems: 'start',
    },
  },
  tab: {
    svg: {
      fontSize: 'inherit',
    },
    '> span, > .MuiSvgIcon-root': {
      display: 'flex',
      color: theme.palette.primary.main,
      marginRight: theme.spacing(1.5),
      height: theme.typography.pxToRem(21),
      width: theme.typography.pxToRem(21),
    },
    [theme.breakpoints.up('sm')]: {
      textAlign: 'right',
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
      minHeight: 'auto',
      paddingTop: theme.spacing(1.5),
      paddingBottom: theme.spacing(1.5),
    },
  },
  indicator: {
    [theme.breakpoints.up('sm')]: {
      right: 0,
      width: '100%',
      backgroundColor: theme.palette.action.hover,
      borderRadius: theme.shape.borderRadius,
    },
  },
}));

export type AppSettingsTab = 'general';

const selectWorkspaceInitialActiveTab = (store: WorkspaceContextStore) =>
  store.prefsDialogState.initialTab;

export function AppSettingsDialog(
  props: DialogProps & { activeTab?: AppSettingsTab }
): JSX.Element {
  const { activeTab: _activeTab } = props;
  const initialActiveTab = useWorkspaceStore(selectWorkspaceInitialActiveTab);
  const [activeTab, setActiveTab] = useState<AppSettingsTab>(
    _activeTab ?? initialActiveTab ?? 'general'
  );

  const { classes, cx } = useStyles();
  const theme = useTheme();
  const smUp = useMediaQuery(theme.breakpoints.up('sm'));

  const handleTabChange = (_event: SyntheticEvent, newValue: AppSettingsTab) => {
    setActiveTab(newValue);
  };

  const handleClose = (event: MouseEvent<HTMLElement>) => {
    if (props.onClose != undefined) {
      props.onClose(event, 'backdropClick');
    }
  };

  return (
    <Dialog {...props} fullWidth maxWidth="md">
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        paddingX={3}
        paddingY={2}
      >
        <Typography variant="h3" fontWeight={600}>
          {'settings'}
        </Typography>
        <IconButton edge="end" onClick={handleClose}>
          <CloseIcon />
        </IconButton>
      </Stack>
      <div className={classes.layoutGrid}>
        <Tabs
          classes={{ indicator: classes.indicator }}
          value={activeTab}
          orientation={smUp ? 'vertical' : 'horizontal'}
          onChange={handleTabChange}
        >
          <Tab className={classes.tab} label={'general'} value="general" />
        </Tabs>
        <Stack direction="row" fullHeight overflowY="auto">
          <section
            className={cx(classes.tabPanel, {
              [classes.tabPanelActive]: activeTab === 'general',
            })}
          >
            <Stack gap={2}>
              <ColorSchemeSettings />
              <TimezoneSettings />
              <TimeFormat orientation={smUp ? 'horizontal' : 'vertical'} />
              <MessageFramerate />
            </Stack>
          </section>
        </Stack>
      </div>
      <DialogActions className={classes.dialogActions}>
        <Button onClick={handleClose}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}
