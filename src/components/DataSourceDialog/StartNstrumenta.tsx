// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Typography } from '@mui/material';
import { useEffect } from 'react';
import { makeStyles } from 'tss-react/mui';

import { useOpenExperiment } from '@base/components/DataSourceDialog/useOpenExperiment';
import ExperimentList from '@base/components/ExperimentList';
import NstrumentaProjectSelect from '@base/components/NstrumentaProjectSelect';
import Stack from '@base/components/Stack';
import { useNstrumentaContext } from '@base/context/NstrumentaContext';
import { usePlayerSelection } from '@base/context/PlayerSelectionContext';
import { useWorkspaceActions } from '@base/context/WorkspaceContext';

const useStyles = makeStyles()((theme) => ({
  logo: {
    width: 212,
    height: 'auto',
    marginLeft: theme.spacing(-1),
  },
  grid: {
    [theme.breakpoints.up('md')]: {
      display: 'grid',
      gridTemplateAreas: `
        "header spacer"
        "content sidebar"
      `,
      gridTemplateRows: `content auto`,
      gridTemplateColumns: `1fr 375px`,
    },
  },
  header: {
    padding: theme.spacing(6),
    gridArea: 'header',

    [theme.breakpoints.down('md')]: {
      padding: theme.spacing(4),
    },
    [`@media (max-height: ${theme.breakpoints.values.sm})`]: {
      display: 'none',
    },
  },
  content: {
    padding: theme.spacing(0, 6, 6),
    overflow: 'hidden',
    gridArea: 'content',

    [theme.breakpoints.down('md')]: {
      padding: theme.spacing(0, 4, 4),
    },
    [`@media (max-height: ${theme.breakpoints.values.sm})`]: {
      paddingTop: theme.spacing(6),
    },
  },
  connectionButton: {
    textAlign: 'left',
    justifyContent: 'flex-start',
    padding: theme.spacing(2, 3),
    gap: theme.spacing(1.5),
    borderColor: theme.palette.divider,

    '.MuiButton-startIcon .MuiSvgIcon-fontSizeLarge': {
      fontSize: 28,
    },
  },
  recentListItemButton: {
    overflow: 'hidden',
    color: theme.palette.primary.main,

    '&:hover': {
      backgroundColor: 'transparent',
      color: theme.palette.primary[theme.palette.mode === 'dark' ? 'light' : 'dark'],
    },
  },
  recentSourceSecondary: {
    color: 'inherit',
  },
}));

export default function StartNstrumenta(): JSX.Element {
  const { selectedSource } = usePlayerSelection();
  const { classes } = useStyles();
  const { dataSourceDialogActions } = useWorkspaceActions();
  const openExperiment = useOpenExperiment();

  const { setExperimentPath } = useNstrumentaContext();

  const experimentParam = new URLSearchParams(window.location.search).get('experiment') ?? '';

  useEffect(() => {
    // open the experiment from param on a new page load
    if (setExperimentPath && experimentParam && !selectedSource) {
      dataSourceDialogActions.open('nstrumenta');
      openExperiment(experimentParam);
    }
  }, [openExperiment, setExperimentPath, selectedSource, experimentParam, dataSourceDialogActions]);

  return (
    <Stack className={classes.grid}>
      <header className={classes.header}></header>
      <Stack className={classes.content}>
        <Stack gap={4}>
          <Stack gap={1}>
            <Typography variant="h5" gutterBottom>
              {'openDataSource'}
            </Typography>
          </Stack>
          <Stack gap={1}>
            <Typography variant="h5" gutterBottom>
              Nstrumenta Project
            </Typography>
            <NstrumentaProjectSelect />
            <ExperimentList
              onSelect={(experiment) => {
                dataSourceDialogActions.open('nstrumenta');
                openExperiment(experiment);
              }}
            ></ExperimentList>
          </Stack>
        </Stack>
      </Stack>
    </Stack>
  );
}
