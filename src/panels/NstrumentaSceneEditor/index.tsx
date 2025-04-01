import Panel from '@base/components/Panel';
import PanelToolbar from '@base/components/PanelToolbar';
import Stack from '@base/components/Stack';
import { SceneEditor } from './SceneEditor';

function NstrumentaPanel(): JSX.Element {
  return (
    <Stack fullHeight>
      <PanelToolbar />
      <SceneEditor />
    </Stack>
  );
}

const defaultConfig: Record<string, unknown> = {};

export default Panel(
  Object.assign(NstrumentaPanel, {
    panelType: 'nstrumentaLabels',
    defaultConfig,
  })
);
