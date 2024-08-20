// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2019-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import Panel from '@base/components/Panel';
import PanelToolbar from '@base/components/PanelToolbar';
import Stack from '@base/components/Stack';
import { useState, useRef, useEffect } from 'react';
import GameScene from './GameScene';

function NstrumentaModelPanel(): JSX.Element {
  const [scene, setScene] = useState<GameScene>();
  const [scroll, setScroll] = useState(0);
  const renderTarget = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (renderTarget.current) {
      const scene = new GameScene(renderTarget.current);
      scene.setSize(window.innerWidth, window.innerHeight);
      setScene(scene);
    }
  }, [renderTarget]);

  useEffect(() => {
    scene?.setScroll(scroll);
  }, [scene, scroll]);

  window.addEventListener("resize", (_event) => {
    scene?.setSize(window.innerWidth, window.innerHeight);
  });

  window.addEventListener("wheel", (event) => {
    setScroll(event.deltaY + scroll);
  });

  return (
    <Stack fullHeight>
      <PanelToolbar />
      <canvas ref={renderTarget} />
    </Stack>
  );
}

const defaultConfig: Record<string, unknown> = {};

export default Panel(
  Object.assign(NstrumentaModelPanel, {
    panelType: 'nstrumentaModel',
    defaultConfig,
  })
);
