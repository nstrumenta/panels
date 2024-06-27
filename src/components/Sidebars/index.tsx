import React from 'react';
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Avatar, Badge, Button, IconButton, Paper, Tab, Tabs } from '@mui/material';
import tc from 'tinycolor2';

import PersonIcon from '@mui/icons-material/Person';
import {
  ComponentProps,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { MosaicNode, MosaicWithoutDragDropContext } from 'react-mosaic-component';
import { makeStyles } from 'tss-react/mui';

import { AppSetting } from '@base/AppSetting';
import { BuiltinIcon } from '@base/components/BuiltinIcon';
import ErrorBoundary from '@base/components/ErrorBoundary';
import { MemoryUseIndicator } from '@base/components/MemoryUseIndicator';
import Stack from '@base/components/Stack';
import { useAppConfigurationValue } from '@base/hooks';
import isDesktopApp from '@base/util/isDesktopApp';

import {
  APP_BAR_BACKGROUND_COLOR,
  APP_BAR_FOREGROUND_COLOR,
} from '@base/components/AppBar/constants';
import { useCurrentUser } from '@base/context/NstrumentaContext';
import 'react-mosaic-component/react-mosaic-component.css';
import { NewSidebar, NewSidebarItem } from './NewSidebar';
import { TabSpacer } from './TabSpacer';

function Noop(): null {
  return null;
}

type LayoutNode = 'leftbar' | 'children' | 'rightbar';

export type SidebarItem = {
  iconName: ComponentProps<typeof BuiltinIcon>['name'];
  title: string;
  badge?: { count: number };
  component?: React.ComponentType;
  url?: string;
};

const useStyles = makeStyles()((theme) => ({
  leftNav: {
    boxSizing: 'content-box',
    borderRight: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
  },
  tabs: {
    flexGrow: 1,

    '.MuiTabs-flexContainerVertical': {
      height: '100%',
    },
  },
  tab: {
    padding: theme.spacing(1.625),
    minWidth: 50,
  },
  badge: {
    '> *:not(.MuiBadge-badge)': {
      width: '1.5rem',
      height: '1.5rem',
      fontSize: '1.5rem',
      display: 'flex',

      '.root-span': {
        display: 'contents',
      },
      svg: {
        fontSize: 'inherit',
        width: 'auto',
        height: 'auto',
      },
    },
  },
  avatar: {
    color: APP_BAR_FOREGROUND_COLOR,
    backgroundColor: tc(APP_BAR_BACKGROUND_COLOR[theme.palette.mode]).lighten().toString(),
    height: theme.spacing(3.5),
    width: theme.spacing(3.5),
    transition: theme.transitions.create('background-color', {
      duration: theme.transitions.duration.shortest,
    }),
  },
  userIconImage: {
    objectFit: 'cover',
    width: '100%',
  },
  mosaicWrapper: {
    flex: '1 1 100%',

    // Root drop targets in this top level sidebar mosaic interfere with drag/mouse events from the
    // PanelList. We don't allow users to edit the mosaic since it's just used for the sidebar, so we
    // can hide the drop targets.
    '& > .mosaic > .drop-target-container': {
      display: 'none !important',
    },
  },
}));

/**
 * Extract existing left split percentage from a layout node or return the default.
 */
function mosiacLeftSidebarSplitPercentage(node: MosaicNode<LayoutNode>): number | undefined {
  if (typeof node !== 'object') {
    return undefined;
  }
  if (node.first === 'leftbar') {
    return node.splitPercentage;
  } else {
    return (
      mosiacLeftSidebarSplitPercentage(node.first) ?? mosiacLeftSidebarSplitPercentage(node.second)
    );
  }
}

/**
 * Extract existing right split percentage from a layout node or return the default.
 */
function mosiacRightSidebarSplitPercentage(node: MosaicNode<LayoutNode>): number | undefined {
  if (typeof node !== 'object') {
    return undefined;
  }
  if (node.second === 'rightbar') {
    return node.splitPercentage;
  } else {
    return (
      mosiacRightSidebarSplitPercentage(node.first) ??
      mosiacRightSidebarSplitPercentage(node.second)
    );
  }
}

type SidebarProps<OldLeftKey, LeftKey, RightKey> = PropsWithChildren<{
  items: Map<OldLeftKey, SidebarItem>;
  bottomItems: Map<OldLeftKey, SidebarItem>;
  selectedKey: OldLeftKey | undefined;
  onSelectKey: (key: OldLeftKey | undefined) => void;

  leftItems: Map<LeftKey, NewSidebarItem>;
  selectedLeftKey: LeftKey | undefined;
  onSelectLeftKey: (key: LeftKey | undefined) => void;
  leftSidebarSize: number | undefined;
  setLeftSidebarSize: (size: number | undefined) => void;

  rightItems: Map<RightKey, NewSidebarItem>;
  selectedRightKey: RightKey | undefined;
  onSelectRightKey: (key: RightKey | undefined) => void;
  rightSidebarSize: number | undefined;
  setRightSidebarSize: (size: number | undefined) => void;
}>;

export default function Sidebars<
  OldLeftKey extends string,
  LeftKey extends string,
  RightKey extends string
>(props: SidebarProps<OldLeftKey, LeftKey, RightKey>): JSX.Element {
  const {
    children,
    items,
    bottomItems,
    selectedKey,
    onSelectKey,
    leftItems,
    selectedLeftKey,
    onSelectLeftKey,
    leftSidebarSize,
    setLeftSidebarSize,
    rightItems,
    selectedRightKey,
    onSelectRightKey,
    rightSidebarSize,
    setRightSidebarSize,
  } = props;
  const [enableMemoryUseIndicator = false] = useAppConfigurationValue<boolean>(
    AppSetting.ENABLE_MEMORY_USE_INDICATOR
  );
  // Since we can't toggle the title bar on an electron window, keep the setting at its initial
  // value until the app is reloaded/relaunched.
  const [currentEnableNewTopNav = false] = useAppConfigurationValue<boolean>(
    AppSetting.ENABLE_NEW_TOPNAV
  );
  const [initialEnableNewTopNav] = useState(currentEnableNewTopNav);
  const enableNewTopNav = isDesktopApp() ? initialEnableNewTopNav : currentEnableNewTopNav;

  const [mosaicValue, setMosaicValue] = useState<MosaicNode<LayoutNode>>('children');
  const { classes } = useStyles();

  const allOldLeftItems = useMemo(() => {
    return new Map([...items, ...bottomItems]);
  }, [bottomItems, items]);

  const oldLeftSidebarOpen = !enableNewTopNav
    ? selectedKey != undefined && allOldLeftItems.has(selectedKey)
    : false;
  const leftSidebarOpen =
    enableNewTopNav && selectedLeftKey != undefined && leftItems.has(selectedLeftKey);
  const rightSidebarOpen =
    enableNewTopNav && selectedRightKey != undefined && rightItems.has(selectedRightKey);

  useEffect(() => {
    const leftTargetWidth = enableNewTopNav ? 320 : 384;
    const rightTargetWidth = 320;
    const defaultLeftPercentage = 100 * (leftTargetWidth / window.innerWidth);
    const defaultRightPercentage = 100 * (1 - rightTargetWidth / window.innerWidth);

    setMosaicValue((oldValue) => {
      let node: MosaicNode<LayoutNode> = 'children';
      if (rightSidebarOpen) {
        node = {
          direction: 'row',
          first: node,
          second: 'rightbar',
          splitPercentage:
            rightSidebarSize ??
            mosiacRightSidebarSplitPercentage(oldValue) ??
            defaultRightPercentage,
        };
      }
      if (oldLeftSidebarOpen || leftSidebarOpen) {
        node = {
          direction: 'row',
          first: 'leftbar',
          second: node,
          splitPercentage:
            leftSidebarSize ?? mosiacLeftSidebarSplitPercentage(oldValue) ?? defaultLeftPercentage,
        };
      }
      return node;
    });
  }, [
    enableNewTopNav,
    leftSidebarSize,
    oldLeftSidebarOpen,
    rightSidebarSize,
    leftSidebarOpen,
    rightSidebarOpen,
  ]);

  const SelectedLeftComponent =
    (selectedKey != undefined && allOldLeftItems.get(selectedKey)?.component) || Noop;

  const onClickTabAction = useCallback(
    (key: OldLeftKey) => {
      // toggle tab selected/unselected on click
      if (selectedKey === key) {
        onSelectKey(undefined);
      } else {
        onSelectKey(key);
      }
    },
    [selectedKey, onSelectKey]
  );

  const topTabs = useMemo(() => {
    return [...items.entries()].map(([key, item]) => (
      <Tab
        data-sidebar-key={key}
        className={classes.tab}
        value={key}
        key={key}
        title={item.title}
        onClick={() => onClickTabAction(key)}
        icon={
          <Badge
            className={classes.badge}
            badgeContent={item.badge?.count}
            invisible={item.badge == undefined}
            color="error"
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
          >
            <BuiltinIcon name={item.iconName} />
          </Badge>
        }
      />
    ));
  }, [classes, items, onClickTabAction]);

  const bottomTabs = useMemo(() => {
    return [...bottomItems.entries()].map(([key, item]) => (
      <Tab
        className={classes.tab}
        value={key}
        key={key}
        title={item.title}
        onClick={() => onClickTabAction(key)}
        icon={
          <Badge
            className={classes.badge}
            badgeContent={item.badge?.count}
            invisible={item.badge == undefined}
            color="error"
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
          >
            <BuiltinIcon name={item.iconName} />
          </Badge>
        }
      />
    ));
  }, [bottomItems, classes, onClickTabAction]);

  const { currentUser, signIn } = useCurrentUser();

  const onChangeMosaicValue = useCallback(
    (newValue: null | MosaicNode<LayoutNode>) => {
      if (newValue != undefined) {
        setMosaicValue(newValue);
        setLeftSidebarSize(mosiacLeftSidebarSplitPercentage(newValue));
        setRightSidebarSize(mosiacRightSidebarSplitPercentage(newValue));
      }
    },
    [setLeftSidebarSize, setRightSidebarSize]
  );

  return (
    <Stack direction="row" fullHeight overflow="hidden">
      {!enableNewTopNav && (
        <Stack className={classes.leftNav} flexShrink={0} justifyContent="space-between">
          <Tabs
            className={classes.tabs}
            orientation="vertical"
            variant="scrollable"
            value={selectedKey ?? false}
            scrollButtons={false}
          >
            {topTabs}
            <TabSpacer />
            {enableMemoryUseIndicator && <MemoryUseIndicator />}
            {bottomTabs}
            {!currentUser && (
              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={() => {
                  signIn();
                }}
              >
                Sign in
              </Button>
            )}

            <IconButton
              aria-label="User profile menu button"
              color="inherit"
              id="user-profile-button"
              onClick={signIn}
            >
              <Avatar className={classes.avatar} variant="rounded">
                {currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    referrerPolicy="same-origin"
                    className={classes.userIconImage}
                  />
                ) : (
                  <PersonIcon />
                )}
              </Avatar>
            </IconButton>
          </Tabs>
        </Stack>
      )}
      {
        // By always rendering the mosaic, even if we are only showing children, we can prevent the
        // children from having to re-mount each time the sidebar is opened/closed.
      }
      <div className={classes.mosaicWrapper}>
        <MosaicWithoutDragDropContext<LayoutNode>
          className=""
          value={mosaicValue}
          onChange={onChangeMosaicValue}
          renderTile={(id) => {
            switch (id) {
              case 'children':
                return <ErrorBoundary>{children as JSX.Element}</ErrorBoundary>;
              case 'leftbar':
                return (
                  <ErrorBoundary>
                    {enableNewTopNav ? (
                      <NewSidebar<LeftKey>
                        anchor="left"
                        onClose={() => onSelectLeftKey(undefined)}
                        items={leftItems}
                        activeTab={selectedLeftKey}
                        setActiveTab={onSelectLeftKey}
                      />
                    ) : (
                      <Paper square elevation={0}>
                        <SelectedLeftComponent />
                      </Paper>
                    )}
                  </ErrorBoundary>
                );
              case 'rightbar':
                return (
                  <ErrorBoundary>
                    <NewSidebar<RightKey>
                      anchor="right"
                      onClose={() => onSelectRightKey(undefined)}
                      items={rightItems}
                      activeTab={selectedRightKey}
                      setActiveTab={onSelectRightKey}
                    />
                  </ErrorBoundary>
                );
            }
          }}
          resize={{ minimumPaneSizePercentage: 10 }}
        />
      </div>
    </Stack>
  );
}
