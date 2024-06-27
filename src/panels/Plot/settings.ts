// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import produce from 'immer';
import { isEqual, isNumber, set } from 'lodash';
import memoizeWeak from 'memoize-weak';
import { useCallback, useEffect } from 'react';

import { PlotPath } from '@base/panels/Plot/internalTypes';
import { usePanelSettingsTreeUpdate } from '@base/providers/PanelStateContextProvider';
import { SaveConfig } from '@base/types/panels';
import { lineColors } from '@base/util/plotColors';
import { SettingsTreeAction, SettingsTreeNode, SettingsTreeNodes } from '@foxglove/studio';

import { plotableRosTypes, PlotConfig, plotPathDisplayName } from './types';

const makeSeriesNode = memoizeWeak((path: PlotPath, index: number): SettingsTreeNode => {
  return {
    actions: [
      {
        type: 'action',
        id: 'delete-series',
        label: 'deleteSeries',
        display: 'inline',
        icon: 'Clear',
      },
    ],
    label: plotPathDisplayName(path, index),
    visible: path.enabled,
    fields: {
      value: {
        label: 'messagePath',
        input: 'messagepath',
        value: path.value,
        validTypes: plotableRosTypes,
      },
      label: {
        input: 'string',
        label: 'label',
        value: path.label,
      },
      color: {
        input: 'rgb',
        label: 'color',
        value: path.color ?? lineColors[index % lineColors.length],
      },
      timestampMethod: {
        input: 'select',
        label: 'timestamp',
        value: path.timestampMethod,
        options: [
          { label: 'receiveTime', value: 'receiveTime' },
          { label: 'headerStamp', value: 'headerStamp' },
        ],
      },
    },
  };
});

const makeRootSeriesNode = memoizeWeak((paths: PlotPath[]): SettingsTreeNode => {
  const children = Object.fromEntries(
    paths.map((path, index) => [`${index}`, makeSeriesNode(path, index)])
  );
  return {
    label: 'series',
    children,
    actions: [
      {
        type: 'action',
        id: 'add-series',
        label: 'addSeries',
        display: 'inline',
        icon: 'Addchart',
      },
    ],
  };
});

function buildSettingsTree(config: PlotConfig): SettingsTreeNodes {
  const maxYError =
    isNumber(config.minYValue) && isNumber(config.maxYValue) && config.minYValue >= config.maxYValue
      ? 'maxYError'
      : undefined;

  const maxXError =
    isNumber(config.minXValue) && isNumber(config.maxXValue) && config.minXValue >= config.maxXValue
      ? 'maxXError'
      : undefined;

  return {
    general: {
      label: 'general',
      fields: {
        isSynced: { label: 'syncWithOtherPlots', input: 'boolean', value: config.isSynced },
      },
    },
    legend: {
      label: 'legend',
      fields: {
        legendDisplay: {
          label: 'position',
          input: 'select',
          value: config.legendDisplay,
          options: [
            { value: 'floating', label: 'floating' },
            { value: 'left', label: 'left' },
            { value: 'top', label: 'top' },
            { value: 'none', label: 'hidden' },
          ],
        },
        showPlotValuesInLegend: {
          label: 'showValues',
          input: 'boolean',
          value: config.showPlotValuesInLegend,
        },
      },
    },
    yAxis: {
      label: 'yAxis',
      defaultExpansionState: 'collapsed',
      fields: {
        showYAxisLabels: {
          label: 'showLabels',
          input: 'boolean',
          value: config.showYAxisLabels,
        },
        minYValue: {
          label: 'min',
          input: 'number',
          value: config.minYValue != undefined ? Number(config.minYValue) : undefined,
          placeholder: 'auto',
        },
        maxYValue: {
          label: 'max',
          input: 'number',
          error: maxYError,
          value: config.maxYValue != undefined ? Number(config.maxYValue) : undefined,
          placeholder: 'auto',
        },
      },
    },
    xAxis: {
      label: 'xAxis',
      defaultExpansionState: 'collapsed',
      fields: {
        xAxisVal: {
          label: 'value',
          input: 'select',
          value: config.xAxisVal,
          options: [
            { label: 'timestamp', value: 'timestamp' },
            { label: 'index', value: 'index' },
            { label: 'currentPath', value: 'currentCustom' },
            { label: 'accumulatedPath', value: 'custom' },
          ],
        },
        xAxisPath:
          config.xAxisVal === 'currentCustom' || config.xAxisVal === 'custom'
            ? {
                label: 'messagePath',
                input: 'messagepath',
                value: config.xAxisPath?.value ?? '',
                validTypes: plotableRosTypes,
              }
            : undefined,
        showXAxisLabels: {
          label: 'showLabels',
          input: 'boolean',
          value: config.showXAxisLabels,
        },
        minXValue: {
          label: 'min',
          input: 'number',
          value: config.minXValue != undefined ? Number(config.minXValue) : undefined,
          placeholder: 'auto',
        },
        maxXValue: {
          label: 'max',
          input: 'number',
          error: maxXError,
          value: config.maxXValue != undefined ? Number(config.maxXValue) : undefined,
          placeholder: 'auto',
        },
        followingViewWidth: {
          label: 'secondsRange',
          input: 'number',
          placeholder: 'auto',
          value: config.followingViewWidth,
        },
        followingViewOffset: {
          label: 'Range Offset (seconds)',
          input: 'number',
          placeholder: 'auto',
          value: config.followingViewOffset,
        },
      },
    },
    paths: makeRootSeriesNode(config.paths),
  };
}

export function usePlotPanelSettings(
  config: PlotConfig,
  saveConfig: SaveConfig<PlotConfig>,
  focusedPath?: readonly string[]
): void {
  const updatePanelSettingsTree = usePanelSettingsTreeUpdate();

  const actionHandler = useCallback(
    (action: SettingsTreeAction) => {
      if (action.action === 'update') {
        const { path, value } = action.payload;
        saveConfig(
          produce((draft) => {
            if (path[0] === 'paths') {
              if (path[2] === 'visible') {
                set(draft, [...path.slice(0, 2), 'enabled'], value);
              } else {
                set(draft, path, value);
              }
            } else if (isEqual(path, ['legend', 'legendDisplay'])) {
              draft.legendDisplay = value;
              draft.showLegend = true;
            } else if (isEqual(path, ['xAxis', 'xAxisPath'])) {
              set(draft, ['xAxisPath', 'value'], value);
            } else {
              set(draft, path.slice(1), value);

              // X min/max and following width are mutually exclusive.
              if (path[1] === 'followingViewWidth') {
                draft.minXValue = undefined;
                draft.maxXValue = undefined;
              } else if (path[1] === 'minXValue' || path[1] === 'maxXValue') {
                draft.followingViewWidth = undefined;
              }
            }
          })
        );
      } else {
        if (action.payload.id === 'add-series') {
          saveConfig(
            produce<PlotConfig>((draft) => {
              draft.paths.push({
                timestampMethod: 'receiveTime',
                value: '',
                enabled: true,
              });
            })
          );
        } else if (action.payload.id === 'delete-series') {
          const index = action.payload.path[1];
          saveConfig(
            produce<PlotConfig>((draft) => {
              draft.paths.splice(Number(index), 1);
            })
          );
        }
      }
    },
    [saveConfig]
  );

  useEffect(() => {
    updatePanelSettingsTree({
      actionHandler,
      focusedPath,
      nodes: buildSettingsTree(config),
    });
  }, [actionHandler, config, focusedPath, updatePanelSettingsTree]);
}
