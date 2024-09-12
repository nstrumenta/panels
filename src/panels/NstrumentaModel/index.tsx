// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { StrictMode, useMemo } from 'react';
import ReactDOM from 'react-dom';

import { useCrash } from '@foxglove/hooks';
import { PanelExtensionContext } from '@foxglove/studio';
import { CaptureErrorBoundary } from '@base/components/CaptureErrorBoundary';
import Panel from '@base/components/Panel';
import { PanelExtensionAdapter } from '@base/components/PanelExtensionAdapter';
import ThemeProvider from '@base/theme/ThemeProvider';
import { SaveConfig } from '@base/types/panels';

import { Model } from './Model';
import { Config } from './types';

function initPanel(crash: ReturnType<typeof useCrash>, context: PanelExtensionContext) {
  ReactDOM.render(
    <StrictMode>
      <CaptureErrorBoundary onError={crash}>
        <ThemeProvider isDark>
          <Model context={context} />
        </ThemeProvider>
      </CaptureErrorBoundary>
    </StrictMode>,
    context.panelElement
  );
  return () => {
    ReactDOM.unmountComponentAtNode(context.panelElement);
  };
}

type Props = {
  config: Config;
  saveConfig: SaveConfig<Config>;
};

function NstrumentaModelPanelAdapter(props: Props) {
  const crash = useCrash();
  const boundInitPanel = useMemo(() => initPanel.bind(undefined, crash), [crash]);

  return (
    <PanelExtensionAdapter
      config={props.config}
      saveConfig={props.saveConfig}
      initPanel={boundInitPanel}
    />
  );
}

NstrumentaModelPanelAdapter.panelType = 'Indicator';
NstrumentaModelPanelAdapter.defaultConfig = {};

export default Panel(NstrumentaModelPanelAdapter);
