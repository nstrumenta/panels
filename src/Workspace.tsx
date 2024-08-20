// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { Link, Typography } from '@mui/material';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { makeStyles } from 'tss-react/mui';

import { AppSetting } from './AppSetting';
import { AppBar } from './components/AppBar';
import { CustomWindowControlsProps } from './components/AppBar/CustomWindowControls';
import { DataSourceDialog } from './components/DataSourceDialog';
import { useOpenExperiment } from './components/DataSourceDialog/useOpenExperiment';
import { DataSourceSidebar } from './components/DataSourceSidebar';
import { EventsList } from './components/DataSourceSidebar/EventsList';
import { TopicList } from './components/DataSourceSidebar/TopicList';
import ExtensionsSettings from './components/ExtensionsSettings';
import KeyListener from './components/KeyListener';
import LayoutBrowser from './components/LayoutBrowser';
import {
  MessagePipelineContext,
  useMessagePipeline,
  useMessagePipelineGetter,
} from './components/MessagePipeline';
import PanelLayout from './components/PanelLayout';
import PanelList from './components/PanelList';
import PanelSettings from './components/PanelSettings';
import PlaybackControls from './components/PlaybackControls';
import RemountOnValueChange from './components/RemountOnValueChange';
import { SidebarContent } from './components/SidebarContent';
import Sidebars, { SidebarItem } from './components/Sidebars';
import { NewSidebarItem } from './components/Sidebars/NewSidebar';
import Stack from './components/Stack';
import { StudioLogsSettings, StudioLogsSettingsSidebar } from './components/StudioLogsSettings';
import { SyncAdapters } from './components/SyncAdapters';
import VariablesList from './components/VariablesList';
import { WorkspaceDialogs } from './components/WorkspaceDialogs';
import {
  LayoutState,
  useCurrentLayoutActions,
  useCurrentLayoutSelector,
} from './context/CurrentLayoutContext';
import { EventsStore, useEvents } from './context/EventsContext';
import { useNstrumentaContext } from './context/NstrumentaContext';
import {
  LeftSidebarItemKey,
  RightSidebarItemKey,
  SidebarItemKey,
  WorkspaceContextStore,
  useWorkspaceActions,
  useWorkspaceStore,
} from './context/WorkspaceContext';
import { useAppConfigurationValue } from './hooks';
import useAddPanel from './hooks/useAddPanel';
import { useDefaultWebLaunchPreference } from './hooks/useDefaultWebLaunchPreference';
import { PlayerPresence } from './players/types';
import { PanelStateContextProvider } from './providers/PanelStateContextProvider';
import WorkspaceContextProvider from './providers/WorkspaceContextProvider';
import { LayoutID } from './services/ILayoutStorage';

const useStyles = makeStyles()({
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    flex: '1 1 100%',
    outline: 'none',
    overflow: 'hidden',
  },
});

const selectedLayoutIdSelector = (state: LayoutState) => state.selectedLayout?.id;

function activeElementIsInput() {
  return (
    document.activeElement instanceof HTMLInputElement ||
    document.activeElement instanceof HTMLTextAreaElement
  );
}

function keyboardEventHasModifier(event: KeyboardEvent) {
  if (navigator.userAgent.includes('Mac')) {
    return event.metaKey;
  } else {
    return event.ctrlKey;
  }
}

function AddPanel() {
  const addPanel = useAddPanel();
  const { openLayoutBrowser } = useWorkspaceActions();
  const selectedLayoutId = useCurrentLayoutSelector(selectedLayoutIdSelector);

  return (
    <SidebarContent disablePadding={selectedLayoutId != undefined} title={'addPanel'}>
      {selectedLayoutId == undefined ? (
        <Typography color="text.secondary">
          <Link onClick={openLayoutBrowser} />
        </Typography>
      ) : (
        <PanelList onPanelSelect={addPanel} />
      )}
    </SidebarContent>
  );
}

function ExtensionsSidebar() {
  return (
    <SidebarContent title="Extensions" disablePadding>
      <ExtensionsSettings />
    </SidebarContent>
  );
}

type WorkspaceProps = CustomWindowControlsProps & {
  deepLinks?: string[];
  appBarLeftInset?: number;
  onAppBarDoubleClick?: () => void;
};

const selectPlayerPresence = ({ playerState }: MessagePipelineContext) => playerState.presence;
const selectPlayerProblems = ({ playerState }: MessagePipelineContext) => playerState.problems;
const selectIsPlaying = (ctx: MessagePipelineContext) =>
  ctx.playerState.activeData?.isPlaying === true;
const selectPause = (ctx: MessagePipelineContext) => ctx.pausePlayback;
const selectPlay = (ctx: MessagePipelineContext) => ctx.startPlayback;
const selectSeek = (ctx: MessagePipelineContext) => ctx.seekPlayback;
const selectPlayUntil = (ctx: MessagePipelineContext) => ctx.playUntil;
const selectPlayerId = (ctx: MessagePipelineContext) => ctx.playerState.playerId;
const selectEventsSupported = (store: EventsStore) => store.eventsSupported;

const selectWorkspaceDataSourceDialog = (store: WorkspaceContextStore) => store.dataSourceDialog;
const selectWorkspaceSidebarItem = (store: WorkspaceContextStore) => store.sidebarItem;
const selectWorkspaceLeftSidebarItem = (store: WorkspaceContextStore) => store.leftSidebarItem;
const selectWorkspaceLeftSidebarOpen = (store: WorkspaceContextStore) => store.leftSidebarOpen;
const selectWorkspaceLeftSidebarSize = (store: WorkspaceContextStore) => store.leftSidebarSize;
const selectWorkspaceRightSidebarItem = (store: WorkspaceContextStore) => store.rightSidebarItem;
const selectWorkspaceRightSidebarOpen = (store: WorkspaceContextStore) => store.rightSidebarOpen;
const selectWorkspaceRightSidebarSize = (store: WorkspaceContextStore) => store.rightSidebarSize;

type WorkspaceContentProps = WorkspaceProps;
function WorkspaceContent(props: WorkspaceContentProps): JSX.Element {
  const { classes } = useStyles();
  const containerRef = useRef<HTMLDivElement>(null);
  const playerPresence = useMessagePipeline(selectPlayerPresence);
  const playerProblems = useMessagePipeline(selectPlayerProblems);

  const sidebarItem = useWorkspaceStore(selectWorkspaceSidebarItem);
  const dataSourceDialog = useWorkspaceStore(selectWorkspaceDataSourceDialog);
  const leftSidebarItem = useWorkspaceStore(selectWorkspaceLeftSidebarItem);
  const leftSidebarOpen = useWorkspaceStore(selectWorkspaceLeftSidebarOpen);
  const leftSidebarSize = useWorkspaceStore(selectWorkspaceLeftSidebarSize);
  const rightSidebarItem = useWorkspaceStore(selectWorkspaceRightSidebarItem);
  const rightSidebarOpen = useWorkspaceStore(selectWorkspaceRightSidebarOpen);
  const rightSidebarSize = useWorkspaceStore(selectWorkspaceRightSidebarSize);

  const {
    dataSourceDialogActions,
    selectLeftSidebarItem,
    selectRightSidebarItem,
    selectSidebarItem,
    setLeftSidebarOpen,
    setLeftSidebarSize,
    setRightSidebarOpen,
    setRightSidebarSize,
  } = useWorkspaceActions();

  // We use playerId to detect when a player changes for RemountOnValueChange below
  // see comment below above the RemountOnValueChange component
  const playerId = useMessagePipeline(selectPlayerId);

  useDefaultWebLaunchPreference();

  const [enableStudioLogsSidebar = false] = useAppConfigurationValue<boolean>(
    AppSetting.SHOW_DEBUG_PANELS
  );

  // Since we can't toggle the title bar on an electron window, keep the setting at its initial
  // value until the app is reloaded/relaunched.
  const [enableNewTopNav = false] = useAppConfigurationValue<boolean>(AppSetting.ENABLE_NEW_TOPNAV);

  // When a player is activated, hide the open dialog.
  useLayoutEffect(() => {
    if (
      playerPresence === PlayerPresence.PRESENT ||
      playerPresence === PlayerPresence.INITIALIZING
    ) {
      dataSourceDialogActions.close();
    }
  }, [playerPresence, dataSourceDialogActions]);

  useEffect(() => {
    // Focus on page load to enable keyboard interaction.
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, []);

  // Since the _component_ field of a sidebar item entry is a component and accepts no additional
  // props we need to wrap our DataSourceSidebar component to connect the open data source action to
  // open the data source dialog.
  const DataSourceSidebarItem = useMemo(() => {
    return function DataSourceSidebarItemImpl() {
      return <DataSourceSidebar disableToolbar={enableNewTopNav} />;
    };
  }, [enableNewTopNav]);

  const PanelSettingsSidebar = useMemo(() => {
    return function PanelSettingsSidebarImpl() {
      return <PanelSettings disableToolbar />;
    };
  }, []);

  const [sidebarItems, sidebarBottomItems] = useMemo(() => {
    const topItems = new Map<SidebarItemKey, SidebarItem>([
      [
        'connection',
        {
          iconName: 'DatabaseSettings',
          title: 'Data source',
          component: DataSourceSidebarItem,
          badge:
            playerProblems && playerProblems.length > 0
              ? { count: playerProblems.length }
              : undefined,
        },
      ],
    ]);

    if (!enableNewTopNav) {
      topItems.set('layouts', {
        iconName: 'FiveTileGrid',
        title: 'Layouts',
        component: LayoutBrowser,
      });
      topItems.set('add-panel', {
        iconName: 'RectangularClipping',
        title: 'Add panel',
        component: AddPanel,
      });
    }
    topItems.set('panel-settings', {
      iconName: 'PanelSettings',
      title: 'Panel settings',
      component: PanelSettings,
    });
    if (!enableNewTopNav) {
      topItems.set('variables', {
        iconName: 'Variable2',
        title: 'Variables',
        component: VariablesList,
      });
      topItems.set('extensions', {
        iconName: 'AddIn',
        title: 'Extensions',
        component: ExtensionsSidebar,
      });
    }
    if (enableStudioLogsSidebar) {
      topItems.set('studio-logs-settings', {
        iconName: 'BacklogList',
        title: 'Studio logs settings',
        component: StudioLogsSettingsSidebar,
      });
    }

    const bottomItems = new Map<SidebarItemKey, SidebarItem>([]);

    if (!enableNewTopNav) {
      bottomItems.set('app-settings', {
        iconName: 'Settings',
        title: 'Settings',
      });
    }

    return [topItems, bottomItems];
  }, [DataSourceSidebarItem, playerProblems, enableStudioLogsSidebar, enableNewTopNav]);

  const eventsSupported = useEvents(selectEventsSupported);

  const setEventsSupported = useEvents((store) => store.setEventsSupported);

  useEffect(() => {
    setEventsSupported(true);
  }, [setEventsSupported]);

  const showEventsTab = eventsSupported;

  const leftSidebarItems = useMemo(() => {
    const items = new Map<LeftSidebarItemKey, NewSidebarItem>([
      ['panel-settings', { title: 'Panel', component: PanelSettingsSidebar }],
      ['topics', { title: 'Topics', component: TopicList }],
    ]);
    return items;
  }, [PanelSettingsSidebar]);

  const rightSidebarItems = useMemo(() => {
    const items = new Map<RightSidebarItemKey, NewSidebarItem>([
      ['variables', { title: 'Variables', component: VariablesList }],
    ]);
    if (enableStudioLogsSidebar) {
      items.set('studio-logs-settings', { title: 'Studio Logs', component: StudioLogsSettings });
    }
    if (showEventsTab) {
      items.set('events', { title: 'Events', component: EventsList });
    }
    return items;
  }, [enableStudioLogsSidebar, showEventsTab]);

  const keyDownHandlers = useMemo(() => {
    return {
      b: (ev: KeyboardEvent) => {
        if (!keyboardEventHasModifier(ev) || activeElementIsInput() || sidebarItem == undefined) {
          return;
        }

        ev.preventDefault();
        selectSidebarItem(undefined);
      },
      '[': () => setLeftSidebarOpen((oldValue) => !oldValue),
      ']': () => setRightSidebarOpen((oldValue) => !oldValue),
    };
  }, [sidebarItem, setLeftSidebarOpen, setRightSidebarOpen, selectSidebarItem]);

  const play = useMessagePipeline(selectPlay);
  const playUntil = useMessagePipeline(selectPlayUntil);
  const pause = useMessagePipeline(selectPause);
  const seek = useMessagePipeline(selectSeek);
  const isPlaying = useMessagePipeline(selectIsPlaying);
  const getMessagePipeline = useMessagePipelineGetter();
  const getTimeInfo = useCallback(
    () => getMessagePipeline().playerState.activeData ?? {},
    [getMessagePipeline]
  );

  return (
    <PanelStateContextProvider>
      {dataSourceDialog.open && <DataSourceDialog />}
      <SyncAdapters />
      <KeyListener global keyDownHandlers={keyDownHandlers} />
      <div className={classes.container} ref={containerRef} tabIndex={0}>
        {enableNewTopNav && (
          <AppBar
            leftInset={props.appBarLeftInset}
            showCustomWindowControls={props.showCustomWindowControls}
            isMaximized={props.isMaximized}
            onMinimizeWindow={props.onMinimizeWindow}
            onMaximizeWindow={props.onMaximizeWindow}
            onUnmaximizeWindow={props.onUnmaximizeWindow}
            onCloseWindow={props.onCloseWindow}
          />
        )}
        <Sidebars
          items={sidebarItems}
          bottomItems={sidebarBottomItems}
          selectedKey={sidebarItem}
          onSelectKey={selectSidebarItem}
          leftItems={leftSidebarItems}
          selectedLeftKey={leftSidebarOpen ? leftSidebarItem : undefined}
          onSelectLeftKey={selectLeftSidebarItem}
          leftSidebarSize={leftSidebarSize}
          setLeftSidebarSize={setLeftSidebarSize}
          rightItems={rightSidebarItems}
          selectedRightKey={rightSidebarOpen ? rightSidebarItem : undefined}
          onSelectRightKey={selectRightSidebarItem}
          rightSidebarSize={rightSidebarSize}
          setRightSidebarSize={setRightSidebarSize}
        >
          {/* To ensure no stale player state remains, we unmount all panels when players change */}
          <RemountOnValueChange value={playerId}>
            <Stack>
              <PanelLayout />
            </Stack>
          </RemountOnValueChange>
        </Sidebars>
        {play && pause && seek && (
          <div style={{ flexShrink: 0 }}>
            <PlaybackControls
              play={play}
              pause={pause}
              seek={seek}
              playUntil={playUntil}
              isPlaying={isPlaying}
              getTimeInfo={getTimeInfo}
            />
          </div>
        )}
      </div>
      <WorkspaceDialogs />
    </PanelStateContextProvider>
  );
}

export default function Workspace(props: WorkspaceProps): JSX.Element {
  const openExperiment = useOpenExperiment();
  const { setExperimentPath } = useNstrumentaContext();
  const experimentParam = new URLSearchParams(window.location.search).get('experiment') ?? '';

  const { setSelectedLayoutId } = useCurrentLayoutActions();

  const layoutId = new URLSearchParams(window.location.search).get('layoutId') ?? '';

  useEffect(() => {
    // open the experiment from param on a new page load
    if (setExperimentPath && experimentParam) {
      openExperiment(experimentParam);
    }
  }, [openExperiment, setExperimentPath, experimentParam]);

  useEffect(() => {
    if (layoutId) {
      // open the layout from param on a new page load
      setSelectedLayoutId(layoutId as LayoutID);
    }
  }, [layoutId, setSelectedLayoutId]);

  return (
    <WorkspaceContextProvider>
      <WorkspaceContent {...props} />
    </WorkspaceContextProvider>
  );
}
