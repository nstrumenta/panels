import React from 'react';
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { useTheme } from '@mui/material';
import { flatten } from 'lodash';
import { ComponentProps, ReactNode, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Mosaic, MosaicNode, MosaicWindow } from 'react-mosaic-component';

import MockMessagePipelineProvider from '@base/components/MessagePipeline/MockMessagePipelineProvider';
import SettingsTreeEditor from '@base/components/SettingsTreeEditor';
import AppConfigurationContext from '@base/context/AppConfigurationContext';
import {
  CurrentLayoutActions,
  SelectedPanelActions,
  useCurrentLayoutActions,
  useSelectedPanels,
} from '@base/context/CurrentLayoutContext';
import { PanelsActions } from '@base/context/CurrentLayoutContext/actions';
import PanelCatalogContext, { PanelCatalog } from '@base/context/PanelCatalogContext';
import { usePanelStateStore } from '@base/context/PanelStateContext';
import { GlobalVariables } from '@base/hooks/useGlobalVariables';
import * as panels from '@base/panels';
import {
  AdvertiseOptions,
  PlayerStateActiveData,
  Progress,
  PublishPayload,
  Topic,
} from '@base/players/types';
import MockCurrentLayoutProvider from '@base/providers/CurrentLayoutProvider/MockCurrentLayoutProvider';
import ExtensionCatalogProvider from '@base/providers/ExtensionCatalogProvider';
import { PanelStateContextProvider } from '@base/providers/PanelStateContextProvider';
import TimelineInteractionStateProvider from '@base/providers/TimelineInteractionStateProvider';
import WorkspaceContextProvider from '@base/providers/WorkspaceContextProvider';
import ThemeProvider from '@base/theme/ThemeProvider';
import { RosDatatypes } from '@base/types/RosDatatypes';
import { SavedProps } from '@base/types/panels';
import { MessageEvent, SettingsTree } from '@foxglove/studio';

import 'react-mosaic-component/react-mosaic-component.css';

function noop() {}

type Frame = {
  [topic: string]: MessageEvent<unknown>[];
};

export type Fixture = {
  frame?: Frame;
  topics?: Topic[];
  capabilities?: string[];
  profile?: string;
  activeData?: Partial<PlayerStateActiveData>;
  progress?: Progress;
  datatypes?: RosDatatypes;
  globalVariables?: GlobalVariables;
  layout?: MosaicNode<string>;
  savedProps?: SavedProps;
  publish?: (request: PublishPayload) => void;
  setPublishers?: (publisherId: string, advertisements: AdvertiseOptions[]) => void;
  setSubscriptions?: ComponentProps<typeof MockMessagePipelineProvider>['setSubscriptions'];
};

type UnconnectedProps = {
  children: React.ReactNode;
  fixture?: Fixture;
  includeSettings?: boolean;
  panelCatalog?: PanelCatalog;
  omitDragAndDrop?: boolean;
  pauseFrame?: ComponentProps<typeof MockMessagePipelineProvider>['pauseFrame'];
  onMount?: (
    arg0: HTMLDivElement,
    actions: CurrentLayoutActions,
    selectedPanelActions: SelectedPanelActions
  ) => void;
  onFirstMount?: (arg0: HTMLDivElement) => void;
  style?: React.CSSProperties;
  // Needed for functionality not in React.CSSProperties, like child selectors: "& > *"
  className?: string;
};

function setNativeValue(element: unknown, value: unknown) {
  const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  if (valueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter?.call(element, value);
  } else {
    valueSetter?.call(element, value);
  }
}

export function makeMockPanelCatalog(): PanelCatalog {
  const allPanels = [...panels.getBuiltin(), ...panels.getDebug()];

  const visiblePanels = [...panels.getBuiltin()];

  return {
    getPanels() {
      return visiblePanels;
    },
    getPanelByType(type: string) {
      return allPanels.find((panel) => panel.type === type);
    },
  };
}

export function triggerInputChange(
  node: HTMLInputElement | HTMLTextAreaElement,
  value: string = ''
): void {
  // force trigger textarea to change
  node.value = `${value} `;
  // trigger input change: https://stackoverflow.com/questions/23892547/what-is-the-best-way-to-trigger-onchange-event-in-react-js
  setNativeValue(node, value);

  const ev = new Event('input', { bubbles: true });
  node.dispatchEvent(ev);
}

export function triggerInputBlur(node: HTMLInputElement | HTMLTextAreaElement): void {
  const ev = new Event('blur', { bubbles: true });
  node.dispatchEvent(ev);
}

export function triggerWheel(target: HTMLElement, deltaX: number): void {
  const event = new WheelEvent('wheel', { deltaX, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
}

export const MosaicWrapper = ({ children }: { children: React.ReactNode }): JSX.Element => {
  return (
    <DndProvider backend={HTML5Backend}>
      <Mosaic
        className="mosaic-foxglove-theme" // prevent the default mosaic theme from being applied
        initialValue="mock"
        renderTile={(_id, path) => {
          return (
            <MosaicWindow title="" path={path} renderPreview={() => <div />}>
              {children}
            </MosaicWindow>
          );
        }}
      />
    </DndProvider>
  );
};

const EmptyTree: SettingsTree = {
  actionHandler: () => undefined,
  nodes: {},
};

function PanelWrapper({
  children,
  includeSettings = false,
}: {
  children?: ReactNode;
  includeSettings?: boolean;
}): JSX.Element {
  const settings =
    usePanelStateStore((store) => Object.values(store.settingsTrees)[0]) ?? EmptyTree;

  return (
    <>
      {includeSettings && <SettingsTreeEditor settings={settings} />}
      {children}
    </>
  );
}

function UnconnectedPanelSetup(props: UnconnectedProps): JSX.Element | null {
  const mockPanelCatalog = useMemo(
    () => props.panelCatalog ?? makeMockPanelCatalog(),
    [props.panelCatalog]
  );
  const [mockAppConfiguration] = useState(() => ({
    get() {
      return undefined;
    },
    async set() {},
    addChangeListener() {},
    removeChangeListener() {},
  }));

  const hasMounted = useRef(false);

  const actions = useCurrentLayoutActions();
  const selectedPanels = useSelectedPanels();

  const [initialized, setInitialized] = useState(false);
  useLayoutEffect(() => {
    if (initialized) {
      return;
    }
    const { globalVariables, layout, savedProps } = props.fixture ?? {};
    if (globalVariables) {
      actions.overwriteGlobalVariables(globalVariables);
    }

    if (layout != undefined) {
      actions.changePanelLayout({ layout });
    }

    if (savedProps) {
      actions.savePanelConfigs({
        configs: Object.entries(savedProps).map(([id, config]) => ({ id, config })),
      });
    }
    setInitialized(true);
  }, [initialized, props.fixture, actions]);

  const {
    frame = {},
    topics = [],
    datatypes,
    capabilities,
    profile,
    activeData,
    progress,
    publish,
    setPublishers,
    setSubscriptions,
  } = props.fixture ?? {};
  let dTypes = datatypes;
  if (!dTypes) {
    const dummyDatatypes: RosDatatypes = new Map();
    for (const { schemaName } of topics) {
      if (schemaName != undefined) {
        dummyDatatypes.set(schemaName, { definitions: [] });
      }
    }
    dTypes = dummyDatatypes;
  }
  const allData = flatten(Object.values(frame));

  const inner = (
    <div
      style={{ width: '100%', height: '100%', display: 'flex', ...props.style }}
      className={props.className}
      ref={(el) => {
        const { onFirstMount, onMount } = props;
        if (el && onFirstMount && !hasMounted.current) {
          hasMounted.current = true;
          onFirstMount(el);
        }
        if (el && onMount) {
          onMount(el, actions, selectedPanels);
        }
      }}
    >
      <MockMessagePipelineProvider
        capabilities={capabilities}
        topics={topics}
        datatypes={dTypes}
        messages={allData}
        pauseFrame={props.pauseFrame}
        profile={profile}
        activeData={activeData}
        progress={progress}
        publish={publish}
        startPlayback={noop}
        pausePlayback={noop}
        seekPlayback={noop}
        setPublishers={setPublishers}
        setSubscriptions={setSubscriptions}
      >
        <PanelCatalogContext.Provider value={mockPanelCatalog}>
          <AppConfigurationContext.Provider value={mockAppConfiguration}>
            <PanelWrapper includeSettings={props.includeSettings}>{props.children}</PanelWrapper>
          </AppConfigurationContext.Provider>
        </PanelCatalogContext.Provider>
      </MockMessagePipelineProvider>
    </div>
  );

  // Wait to render children until we've initialized state as requested in the fixture
  if (!initialized) {
    return null;
  }

  const { omitDragAndDrop = false } = props;
  return omitDragAndDrop ? inner : <MosaicWrapper>{inner}</MosaicWrapper>;
}

type Props = UnconnectedProps & {
  includeSettings?: boolean;
  onLayoutAction?: (action: PanelsActions) => void;
};

export default function PanelSetup(props: Props): JSX.Element {
  const theme = useTheme();
  return (
    <WorkspaceContextProvider>
      <TimelineInteractionStateProvider>
        <MockCurrentLayoutProvider onAction={props.onLayoutAction}>
          <PanelStateContextProvider>
            <ExtensionCatalogProvider loaders={[]}>
              <ThemeProvider isDark={theme.palette.mode === 'dark'}>
                <UnconnectedPanelSetup {...props} />
              </ThemeProvider>
            </ExtensionCatalogProvider>
          </PanelStateContextProvider>
        </MockCurrentLayoutProvider>
      </TimelineInteractionStateProvider>
    </WorkspaceContextProvider>
  );
}
