// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { PanelInfo } from '@base/context/PanelCatalogContext';
import { TAB_PANEL_TYPE } from '@base/util/globalConstants';

import dataSourceInfoThumbnail from './DataSourceInfo/thumbnail.png';
import gaugeThumbnail from './Gauge/thumbnail.png';
import imageViewThumbnail from './Image/thumbnail.png';
import indicatorThumbnail from './Indicator/thumbnail.png';
import mapThumbnail from './Map/thumbnail.png';
import nstrumentaLogo from './NstrumentaLabels/thumbnail.png';
import parametersThumbnail from './Parameters/thumbnail.png';
import plotThumbnail from './Plot/thumbnail.png';
import publishThumbnail from './Publish/thumbnail.png';
import rawMessagesThumbnail from './RawMessages/thumbnail.png';
import stateTransitionsThumbnail from './StateTransitions/thumbnail.png';
import tabThumbnail from './Tab/thumbnail.png';
import tableThumbnail from './Table/thumbnail.png';
import teleopThumbnail from './Teleop/thumbnail.png';
import topicGraphThumbnail from './TopicGraph/thumbnail.png';
import variableSliderThumbnail from './VariableSlider/thumbnail.png';

export const getBuiltin: () => PanelInfo[] = () => [
  {
    title: 'nstrumentaLabels',
    type: 'nstrumentaLabels',
    description: 'nstrumenta data labeling',
    thumbnail: nstrumentaLogo,
    module: async () => await import('./NstrumentaLabels'),
  },
  {
    title: 'nstrumentaVideo',
    type: 'nstrumentaVideo',
    description: 'video playback',
    thumbnail: nstrumentaLogo,
    module: async () => await import('./NstrumentaVideo'),
  },
  {
    title: 'nstrumentaModel',
    type: 'nstrumentaModel',
    description: 'rendered model',
    thumbnail: nstrumentaLogo,
    module: async () => await import('./NstrumentaModel'),
  },
  {
    title: 'image',
    type: 'ImageViewPanel',
    description: 'imageDescription',
    thumbnail: imageViewThumbnail,
    module: async () => await import('./Image'),
  },
  {
    title: 'indicator',
    type: 'Indicator',
    description: 'indicatorDescription',
    thumbnail: indicatorThumbnail,
    module: async () => await import('./Indicator'),
  },
  {
    title: 'gauge',
    type: 'Gauge',
    description: 'gaugeDescription',
    thumbnail: gaugeThumbnail,
    module: async () => await import('./Gauge'),
  },
  {
    title: 'teleop',
    type: 'Teleop',
    description: 'teleopDescription',
    thumbnail: teleopThumbnail,
    module: async () => await import('./Teleop'),
  },
  {
    title: 'map',
    type: 'map',
    description: 'mapDescription',
    thumbnail: mapThumbnail,
    module: async () => await import('./Map'),
  },
  {
    title: 'parameters',
    type: 'Parameters',
    description: 'parametersDescription',
    thumbnail: parametersThumbnail,
    module: async () => await import('./Parameters'),
  },
  {
    title: 'plot',
    type: 'Plot',
    description: 'plotDescription',
    thumbnail: plotThumbnail,
    module: async () => await import('./Plot'),
  },
  {
    title: 'publish',
    type: 'Publish',
    description: 'publishDescription',
    thumbnail: publishThumbnail,
    module: async () => await import('./Publish'),
  },
  {
    title: 'rawMessages',
    type: 'RawMessages',
    description: 'rawMessagesDescription',
    thumbnail: rawMessagesThumbnail,
    module: async () => await import('./RawMessages'),
    hasCustomToolbar: true,
  },
  {
    title: 'stateTransitions',
    type: 'StateTransitions',
    description: 'stateTransitionsDescription',
    thumbnail: stateTransitionsThumbnail,
    module: async () => await import('./StateTransitions'),
  },
  {
    title: 'table',
    type: 'Table',
    description: 'tableDescription',
    thumbnail: tableThumbnail,
    module: async () => await import('./Table'),
    hasCustomToolbar: true,
  },
  {
    title: 'topicGraph',
    type: 'TopicGraph',
    description: 'topicGraphDescription',
    thumbnail: topicGraphThumbnail,
    module: async () => await import('./TopicGraph'),
  },
  {
    title: 'dataSourceInfo',
    type: 'SourceInfo',
    description: 'dataSourceInfoDescription',
    thumbnail: dataSourceInfoThumbnail,
    module: async () => await import('./DataSourceInfo'),
  },
  {
    title: 'variableSlider',
    type: 'GlobalVariableSliderPanel',
    description: 'variableSliderDescription',
    thumbnail: variableSliderThumbnail,
    module: async () => await import('./VariableSlider'),
  },
  {
    title: 'tab',
    type: TAB_PANEL_TYPE,
    description: 'tabDescription',
    thumbnail: tabThumbnail,
    module: async () => await import('./Tab'),
    hasCustomToolbar: true,
  },
];

export const getDebug: () => PanelInfo[] = () => [
  {
    title: 'studioPlaybackPerformance',
    type: 'PlaybackPerformance',
    description: 'studioPlaybackPerformanceDescription',
    module: async () => await import('./PlaybackPerformance'),
  },
];

export const getNewImage: () => PanelInfo = () => ({
  title: 'newImage',
  type: 'Image',
  module: async () => ({ default: (await import('./Image')).default }),
});
