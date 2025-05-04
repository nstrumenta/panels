// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

import { MessagePipelineContext, useMessagePipeline } from '@base/components/MessagePipeline';
import Stack from '@base/components/Stack';
import { NstrumentaExperiment, useNstrumentaContext } from '@base/context/NstrumentaContext';
import { useEffect, useState } from 'react';

export function ExperimentTab(): JSX.Element {
  const { experiment, setExperiment, saveExperiment } = useNstrumentaContext();

  const [workingText, setWorkingText] = useState('');

  // set workingText to experiment
  useEffect(() => {
    if (experiment) {
      setWorkingText(JSON.stringify(experiment, null, 2));
    }
  }, [experiment]);

  useMessagePipeline((ctx: MessagePipelineContext) => {
    return ctx.playerState.activeData;
  });

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setWorkingText(event.target.value);
    // saveExperiment if workingText is valid JSON handling the parsing error silently
    try {
      const parsedExperiment = JSON.parse(event.target.value);
      if (setExperiment && parsedExperiment) {
        setExperiment(parsedExperiment as NstrumentaExperiment);
      }
    } catch (error) {
      // Ignore parsing errors
    }
  };

  return (
    <Stack flex="auto" fullHeight>
      <Button
        style={{ width: 'fit-content', margin: '2px' }}
        variant="contained"
        color="inherit"
        title="Save Experiment to nstrumenta"
        onClick={saveExperiment}
      >
        Save
      </Button>
      <Stack gap={2} justifyContent="flex-start" flex="auto" fullHeight>
        <TextField
          multiline
          fullWidth
          minRows={10}
          maxRows={20}
          variant="outlined"
          value={workingText}
          onChange={handleTextChange}
          placeholder="Edit JSON here"
        />
      </Stack>
    </Stack>
  );
}
