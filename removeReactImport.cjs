const fs = require('fs');
const path = require('path');

// Example input string
const errorString = `
Errors  Files
     1  src/Workspace.tsx:103
     1  src/components/AppBar/AddPanelMenu.tsx:1
     1  src/components/AppBar/AppBarDropdownButton.tsx:1
     1  src/components/AppBar/CustomWindowControls.tsx:1
     1  src/components/AppBar/DataSource.tsx:1
     1  src/components/AppBar/StorybookDecorator.stories.tsx:1
     1  src/components/AppBar/UserMenu.tsx:1
     1  src/components/AppSettingsDialog/AppSettingsDialog.stories.tsx:1
     3  src/components/AppSettingsDialog/AppSettingsDialog.tsx:1
     1  src/components/AppSettingsDialog/index.tsx:1
     1  src/components/AutoSizingCanvas/index.stories.tsx:1
     1  src/components/AutoSizingCanvas/index.tsx:1
     1  src/components/Autocomplete.stories.tsx:1
     2  src/components/Autocomplete.tsx:1
     1  src/components/BlockheadFilledIcon.tsx:1
     1  src/components/BlockheadIcon.tsx:1
     1  src/components/BuiltinIcon.tsx:1
     1  src/components/CaptureErrorBoundary.tsx:1
     1  src/components/Chart/index.stories.tsx:1
     1  src/components/CopyButton.tsx:1
     1  src/components/CreateEventDialog.stories.tsx:1
     1  src/components/CreateEventDialog.tsx:1
     1  src/components/CssBaseline.stories.tsx:1
     1  src/components/CssBaseline.tsx:1
     1  src/components/DataSourceDialog/Connection.tsx:1
     1  src/components/DataSourceDialog/DataSourceDialog.tsx:1
     1  src/components/DataSourceDialog/FormField.tsx:1
     1  src/components/DataSourceDialog/Snow.tsx:1
     1  src/components/DataSourceDialog/StartNstrumenta.tsx:1
     1  src/components/DataSourceDialog/View.tsx:1
     1  src/components/DataSourceDialog/useOpenExperiment.tsx:1
     1  src/components/DataSourceDialog/useOpenFile.tsx:1
     1  src/components/DataSourceSidebar/DataSourceSidebar.stories.tsx:1
     2  src/components/DataSourceSidebar/DataSourceSidebar.tsx:1
     1  src/components/DataSourceSidebar/EventsList.stories.tsx:1
     1  src/components/DataSourceSidebar/EventsList.tsx:1
     1  src/components/DataSourceSidebar/ExperimentTab.tsx:1
     1  src/components/DataSourceSidebar/ProblemsList.tsx:1
     1  src/components/DataSourceSidebar/TopicList.stories.tsx:1
     1  src/components/DataSourceSidebar/index.tsx:1
     1  src/components/DirectTopicStatsUpdater.tsx:1
     1  src/components/DocumentDropListener.test.tsx:1
     1  src/components/DocumentDropListener.tsx:1
     1  src/components/DocumentTitleAdapter.tsx:1
     1  src/components/DropOverlay.stories.tsx:1
     1  src/components/DropOverlay.tsx:1
     1  src/components/EmptyPanelLayout.tsx:1
     1  src/components/EmptyState.tsx:1
     1  src/components/ErrorBoundary.stories.tsx:1
     1  src/components/ErrorBoundary.tsx:1
     1  src/components/ErrorDisplay.tsx:1
     1  src/components/EventIcon.tsx:1
     1  src/components/EventOutlinedIcon.tsx:1
     1  src/components/ExperimentList/index.stories.tsx:1
     1  src/components/ExperimentalFeatureSettings.stories.tsx:1
     1  src/components/ExtensionDetails.stories.tsx:1
     1  src/components/ExtensionsSettings/index.stories.tsx:1
     1  src/components/FoxgloveLogo.tsx:1
     1  src/components/FoxgloveLogoText.tsx:1
     1  src/components/GlobalCss.tsx:1
     1  src/components/HighlightedText.tsx:1
     1  src/components/JsonTree/useGetItemStringWithTimezone.tsx:1
     1  src/components/KeyListener.tsx:1
     1  src/components/LayoutBrowser/LayoutSection.tsx:1
     1  src/components/LayoutBrowser/SignInPrompt.tsx:1
     1  src/components/LayoutBrowser/UnsavedChangesPrompt.stories.tsx:1
     1  src/components/LayoutBrowser/index.stories.tsx:1
     1  src/components/LoopIcon.tsx:1
     1  src/components/MemoryUseIndicator.tsx:1
     1  src/components/MessagePathSyntax/parseRosPath.ts:20
     1  src/components/MessagePathSyntax/useCachedGetMessagePathDataItems.test.tsx:1
     1  src/components/MessagePathSyntax/useMessageDataItem.test.tsx:1
     2  src/components/MessagePathSyntax/useMessagesByPath.test.tsx:1
     1  src/components/MessagePipeline/index.test.tsx:1
     1  src/components/MockPanelContextProvider.tsx:1
     1  src/components/MultilineMiddleTruncate.tsx:1
     1  src/components/NotificationModal.stories.tsx:1
     1  src/components/Panel.test.tsx:1
     4  src/components/Panel.tsx:1
     2  src/components/PanelContext.ts:41
     1  src/components/PanelContextMenu.stories.tsx:1
     1  src/components/PanelContextMenu.tsx:1
     1  src/components/PanelErrorBoundary.tsx:1
     1  src/components/PanelExtensionAdapter/PanelExtensionAdapter.stories.tsx:1
     1  src/components/PanelExtensionAdapter/PanelExtensionAdapter.test.tsx:1
     1  src/components/PanelExtensionAdapter/PanelExtensionAdapter.tsx:1
     1  src/components/PanelLayout.stories.tsx:1
     2  src/components/PanelLayout.tsx:1
     1  src/components/PanelList/index.stories.tsx:1
     2  src/components/PanelList/index.tsx:200
     1  src/components/PanelRemounter.tsx:1
     1  src/components/PanelRoot.tsx:1
     1  src/components/PanelSettings/index.stories.tsx:1
     4  src/components/PanelSettings/index.tsx:144
     1  src/components/PanelToolbar/ChangePanelMenu.tsx:1
     1  src/components/PlaybackControls/PlaybackBarHoverTicks.tsx:1
     1  src/components/PlaybackControls/PlaybackControlsTooltipContent.stories.tsx:1
     1  src/components/PlaybackControls/PlaybackControlsTooltipContent.tsx:1
     1  src/components/PlaybackControls/PlaybackTimeDisplay.tsx:1
     1  src/components/PlaybackControls/ProgressPlot.stories.tsx:1
     1  src/components/PlaybackControls/ProgressPlot.tsx:1
     1  src/components/PlaybackControls/RepeatAdapter.tsx:1
     1  src/components/PlaybackControls/Slider.stories.tsx:1
     1  src/components/PlaybackControls/index.tsx:1
     1  src/components/PlaybackSpeedControls.stories.tsx:1
     1  src/components/PlayerManager.tsx:1
     1  src/components/PublishGoalIcon.tsx:1
     1  src/components/PublishPointIcon.tsx:1
     1  src/components/PublishPoseEstimateIcon.tsx:1
     1  src/components/RemountOnValueChange.test.tsx:1
     1  src/components/RemountOnValueChange.tsx:1
     1  src/components/SendNotificationToastAdapter.stories.tsx:1
     1  src/components/SendNotificationToastAdapter.tsx:1
     1  src/components/SettingsTreeEditor/VisibilityToggle.tsx:1
     1  src/components/SettingsTreeEditor/index.stories.tsx:1
     3  src/components/SettingsTreeEditor/index.tsx:1
     1  src/components/SettingsTreeEditor/inputs/ColorGradientInput.stories.tsx:1
     1  src/components/SettingsTreeEditor/inputs/ColorPickerControl.stories.tsx:1
     1  src/components/SettingsTreeEditor/inputs/ColorPickerControl.tsx:1
     1  src/components/SettingsTreeEditor/inputs/ColorPickerInput.tsx:1
     1  src/components/SettingsTreeEditor/inputs/Vec2Input.tsx:1
     1  src/components/SettingsTreeEditor/inputs/Vec3Input.tsx:1
     1  src/components/ShareJsonModal.stories.tsx:1
     1  src/components/ShareJsonModal.tsx:1
     1  src/components/Sidebars/NewSidebar.stories.tsx:1
     1  src/components/Sidebars/TabSpacer.tsx:1
     1  src/components/Sidebars/index.stories.tsx:1
     1  src/components/Sparkline.stories.tsx:1
     1  src/components/Sparkline.tsx:1
     1  src/components/Stack.stories.tsx:1
     1  src/components/StudioLogsSettings/StudioLogsSettings.tsx:1
     1  src/components/StudioToastProvider.stories.tsx:1
     1  src/components/SyncAdapters.tsx:1
     1  src/components/TextHighlight.tsx:1
     1  src/components/TextMiddleTruncate.stories.tsx:1
     1  src/components/TextMiddleTruncate.tsx:1
     1  src/components/TimeBasedChart/TimeBasedChartTooltipContent.stories.tsx:1
     1  src/components/TimeBasedChart/index.stories.tsx:1
     2  src/components/TimeBasedChart/index.tsx:1
     1  src/components/Timestamp.stories.tsx:1
     1  src/components/Timestamp.tsx:1
     1  src/components/URLStateSyncAdapter.tsx:1
     1  src/components/UnknownPanel.tsx:1
     1  src/components/VariablesList/index.stories.tsx:1
     1  src/components/VariablesList/index.tsx:1
     1  src/components/WorkspaceDialogs.tsx:1
     1  src/components/WssErrorModal.stories.tsx:1
     1  src/components/WssErrorModal.tsx:1
     1  src/context/CurrentLayoutContext/useCurrentLayoutSelector.test.tsx:1
     1  src/context/TimelineInteractionStateContext.tsx:1
     1  src/dataSources/RemoteDataSourceFactory.tsx:1
     1  src/hooks/useAppConfigurationValue.test.tsx:1
     1  src/hooks/useConfirm.stories.tsx:1
     1  src/hooks/useConfirm.tsx:1
     5  src/hooks/useMemoryInfo.ts:17
     1  src/hooks/usePanelDrag.tsx:1
     1  src/hooks/usePanelMousePresence.tsx:1
     1  src/hooks/usePrompt.test.tsx:1
     1  src/hooks/usePrompt.tsx:1
     1  src/hooks/usePublisher.tsx:1
     1  src/hooks/useStateToURLSynchronization.test.tsx:1
     1  src/hooks/useSynchronousMountedState.test.tsx:1
     1  src/hooks/useSynchronousMountedState.tsx:1
     1  src/hooks/useTopicPublishFrequences.test.tsx:1
     1  src/i18n/zh/addPanel.ts:6
     1  src/i18n/zh/appBar.ts:7
     1  src/i18n/zh/appSettings.ts:7
     1  src/i18n/zh/dataSourceInfo.ts:7
     1  src/i18n/zh/general.ts:8
     1  src/i18n/zh/log.ts:7
     1  src/i18n/zh/openDialog.ts:7
     1  src/i18n/zh/panelSettings.ts:7
     1  src/i18n/zh/panels.ts:7
     1  src/i18n/zh/plot.ts:7
     1  src/i18n/zh/settingsEditor.ts:7
     1  src/i18n/zh/threeDee.ts:7
     1  src/index.ts:9
     1  src/panels/DataSourceInfo/index.stories.tsx:1
     1  src/panels/Gauge/Gauge.tsx:1
     1  src/panels/Gauge/index.stories.tsx:1
     1  src/panels/Gauge/index.tsx:1
     1  src/panels/Image/ImageView.tsx:1
     1  src/panels/Image/components/ImageEmptyState.tsx:1
     1  src/panels/Image/components/Toolbar.tsx:1
     1  src/panels/Image/components/ZoomMenu.stories.tsx:1
     1  src/panels/Image/components/ZoomMenu.tsx:1
     1  src/panels/Image/index.tsx:1
     1  src/panels/Image/lib/renderImage.stories.tsx:1
     2  src/panels/Image/storySupport/useCompressedImage.ts:11
     1  src/panels/Indicator/Indicator.tsx:1
     1  src/panels/Indicator/index.stories.tsx:1
     1  src/panels/Indicator/index.tsx:1
     1  src/panels/Map/MapPanel.tsx:1
     1  src/panels/Map/index.stories.tsx:1
     1  src/panels/Map/index.tsx:1
     1  src/panels/Map/initPanel.tsx:1
     1  src/panels/NodePlayground/BottomBar/DiagnosticsSection.tsx:1
     1  src/panels/NodePlayground/BottomBar/PromptSection.tsx:1
     1  src/panels/NodePlayground/Editor.tsx:278
     1  src/panels/NodePlayground/index.stories.tsx:1
     1  src/panels/NstrumentaLabels/index.stories.tsx:1
     1  src/panels/NstrumentaLabels/index.tsx:1
     1  src/panels/NstrumentaVideo/index.tsx:1
     1  src/panels/Parameters/index.stories.tsx:1
     1  src/panels/Parameters/index.tsx:1
     1  src/panels/PlaybackPerformance/index.stories.tsx:1
     1  src/panels/Plot/PlotChart.tsx:1
     1  src/panels/Plot/PlotLegend.stories.tsx:1
     1  src/panels/Plot/PlotLegendRow.tsx:1
     1  src/panels/Plot/datasets.tsx:1
     1  src/panels/Plot/index.stories.tsx:1
     1  src/panels/Plot/index.tsx:1
     3  src/panels/Plot/plotData.ts:109
     5  src/panels/Plot/settings.ts:71
     1  src/panels/Publish/index.stories.tsx:1
     1  src/panels/RawMessages/DiffSpan.tsx:1
     1  src/panels/RawMessages/DiffStats.tsx:1
     1  src/panels/RawMessages/HighlightedValue.tsx:1
     1  src/panels/RawMessages/MaybeCollapsedValue.tsx:1
     1  src/panels/RawMessages/Metadata.tsx:1
     1  src/panels/RawMessages/index.stories.tsx:1
     1  src/panels/StateTransitions/index.stories.tsx:1
     1  src/panels/Tab/DraggableToolbarTab.tsx:1
     1  src/panels/Tab/TabbedToolbar.tsx:1
     2  src/panels/Tab/ToolbarTab.stories.tsx:1
     2  src/panels/Tab/ToolbarTab.tsx:1
     1  src/panels/Tab/index.stories.tsx:1
     1  src/panels/Tab/index.tsx:1
     1  src/panels/Table/index.stories.tsx:1
     1  src/panels/Teleop/DirectionalPad.stories.tsx:1
     1  src/panels/Teleop/DirectionalPad.tsx:1
     1  src/panels/Teleop/TeleopPanel.tsx:1
     1  src/panels/Teleop/index.stories.tsx:1
     1  src/panels/Teleop/index.tsx:1
     1  src/panels/TopicGraph/Graph.tsx:1
     1  src/panels/TopicGraph/index.stories.tsx:1
     1  src/panels/TopicGraph/index.tsx:1
     1  src/panels/VariableSlider/index.stories.tsx:1
     1  src/panels/VariableSlider/index.tsx:1
    17  src/panels/index.ts:45
     4  src/players/UserNodePlayer/nodeTransformerWorker/typescript/templates/index.ts:14
     1  src/providers/CurrentLayoutProvider/index.test.tsx:1
     1  src/providers/CurrentLayoutProvider/reducers.test.tsx:1
     1  src/providers/EventsProvider.tsx:1
     1  src/providers/ExtensionCatalogProvider.test.tsx:1
     2  src/providers/ExtensionCatalogProvider.tsx:1
     1  src/providers/NstrumentaProvider.tsx:1
     1  src/providers/PanelStateContextProvider.tsx:1
     1  src/providers/StudioLogsSettingsProvider/StudioLogsSettingsProvider.tsx:1
     1  src/providers/TimelineInteractionStateProvider.tsx:1
     1  src/providers/WorkspaceContextProvider.tsx:1
     1  src/screens/LaunchPreference.tsx:1
     1  src/screens/LaunchPreferenceScreen.stories.tsx:1
     1  src/screens/LaunchingInDesktopScreen.stories.tsx:1
     1  src/screens/LaunchingInDesktopScreen.tsx:1
     1  src/services/migrateLayout.ts:55
     1  src/stories/inScreenshotTests.stories.tsx:1
     1  src/test/mocks/MockSvg.tsx:1
     1  src/test/stubs/MonacoEditor.tsx:1
     1  src/theme/index.stories.tsx:1
     1  src/theme/muiComponents.stories.tsx:1
     1  src/util/errors.test.ts:38
     1  src/util/getItemString.tsx:1
     1  src/util/showOpenFilePicker.tsx:1
`;

// Function to parse the input string and extract file paths
function extractFilePaths(errorString) {
  const lines = errorString.split('\n').slice(1); // Skip the header line
  const filePaths = [];

  lines.forEach((line) => {
    const match = line.trim().split(/\s+/);
    if (match.length > 1) {
      filePaths.push(match[1].split(':')[0]); // Remove the line number part
    }
  });

  return filePaths;
}

// Function to remove the import line from a file
function removeReactImport(file) {
  const filePath = path.resolve(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const importLine = "import React from 'react';";

  if (content.includes(importLine)) {
    const newContent = content.replace(`${importLine}\n`, '');
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

// Extract file paths from the error string
const filePaths = extractFilePaths(errorString);

// Remove the import line from each file
filePaths.forEach(removeReactImport);

console.log('Completed updating specified .tsx files.');
