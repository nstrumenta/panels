import React from 'react';
/** @jest-environment jsdom */
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { render } from '@testing-library/react';

import MockMessagePipelineProvider from '@base/components/MessagePipeline/MockMessagePipelineProvider';
import MultiProvider from '@base/components/MultiProvider';
import StudioToastProvider from '@base/components/StudioToastProvider';
import AppConfigurationContext from '@base/context/AppConfigurationContext';
import MockCurrentLayoutProvider from '@base/providers/CurrentLayoutProvider/MockCurrentLayoutProvider';
import TimelineInteractionStateProvider from '@base/providers/TimelineInteractionStateProvider';
import WorkspaceContextProvider from '@base/providers/WorkspaceContextProvider';
import { makeMockAppConfiguration } from '@base/util/makeMockAppConfiguration';

import { AppBar } from '.';

function Wrapper({ children }: React.PropsWithChildren<unknown>): JSX.Element {
  const appConfiguration = makeMockAppConfiguration();
  const providers = [
    /* eslint-disable react/jsx-key */
    <WorkspaceContextProvider />,
    <AppConfigurationContext.Provider value={appConfiguration} />,
    <StudioToastProvider />,
    <TimelineInteractionStateProvider />,
    <MockMessagePipelineProvider />,
    <MockCurrentLayoutProvider />,
    /* eslint-enable react/jsx-key */
  ];
  return <MultiProvider providers={providers}>{children}</MultiProvider>;
}

describe('<AppBar />', () => {
  it('calls functions for custom window controls', async () => {
    const mockMinimize = jest.fn();
    const mockMaximize = jest.fn();
    const mockUnmaximize = jest.fn();
    const mockClose = jest.fn();

    const root = render(
      <Wrapper>
        <AppBar
          showCustomWindowControls
          onMinimizeWindow={mockMinimize}
          onMaximizeWindow={mockMaximize}
          onUnmaximizeWindow={mockUnmaximize}
          onCloseWindow={mockClose}
        />
      </Wrapper>
    );

    const minButton = await root.findByTestId('win-minimize');
    minButton.click();
    expect(mockMinimize).toHaveBeenCalled();

    const maxButton = await root.findByTestId('win-maximize');
    maxButton.click();
    expect(mockMaximize).toHaveBeenCalled();
    expect(mockUnmaximize).not.toHaveBeenCalled();

    root.rerender(
      <Wrapper>
        <AppBar
          showCustomWindowControls
          onMinimizeWindow={mockMinimize}
          onMaximizeWindow={mockMaximize}
          onUnmaximizeWindow={mockUnmaximize}
          onCloseWindow={mockClose}
          isMaximized
        />
      </Wrapper>
    );
    maxButton.click();
    expect(mockUnmaximize).toHaveBeenCalled();

    const closeButton = await root.findByTestId('win-close');
    closeButton.click();
    expect(mockClose).toHaveBeenCalled();

    root.unmount();
  });
});
