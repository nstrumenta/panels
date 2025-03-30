// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { StrictMode, useEffect, useMemo, useState } from 'react';

import Panel from '@base/components/Panel';
import { useNstrumentaContext } from '@base/context/NstrumentaContext';

import { CaptureErrorBoundary } from '@base/components/CaptureErrorBoundary';
import { PanelExtensionAdapter } from '@base/components/PanelExtensionAdapter';
import { useCrash } from '@base/hooks';
import { PanelExtensionContext } from '@base/studio';
import ThemeProvider from '@base/theme/ThemeProvider';
import { SaveConfig } from '@base/types/panels';

import { collection, getFirestore, onSnapshot } from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';
import ReactDOM from 'react-dom';
import { SceneEditor } from './SceneEditor';
import { Config } from './types';

// function NstrumentaSceneEditorPanel({context}:Props): JSX.Element {
//   const iframeRef = useRef<HTMLIFrameElement>(null);

//   const { firebaseInstance, experiment, projectId } = useNstrumentaContext();

//   const injectScriptIntoIframe = () => {
//     if (iframeRef.current) {
//       const script = document.createElement('script');
//       script.src = '/scripts/editorMessagePassing.js';
//       iframeRef.current.contentDocument?.body.appendChild(script);
//     }
//   };
//   useEffect(() => {
//     if (iframeRef.current) {
//       iframeRef.current.onload = injectScriptIntoIframe;
//     }
//   }, []);

//   useEffect(() => {
//     if (firebaseInstance && experiment && projectId) {
//       const subscribeToScene = async () => {
//         const dataCollectionPath = `projects/${projectId}/data`;

//         const db = getFirestore(firebaseInstance.app);
//         const collectionRef = collection(db, dataCollectionPath); // e.g., projects/{projectId}/data

//         onSnapshot(collectionRef, (snapshot) => {
//           snapshot.docChanges().forEach(async (change) => {
//             // Handle document changes here
//             const docData = change.doc.data();

//             if (experiment.sceneFile == docData.filePath) {
//               // Post message to iframe with new scene data
//               if (iframeRef.current) {
//                 const sourceUrl = await getDownloadURL(
//                   ref(firebaseInstance!.storage, docData.filePath)
//                 );

//                 // Fetch the scene JSON from the source URL
//                 const response = await fetch(sourceUrl);
//                 iframeRef.current.contentWindow?.postMessage(
//                   {
//                     type: 'editor iFrame setState',
//                     state: response.ok ? await response.json() : {},
//                   },
//                   '*'
//                 );
//               }
//             }
//           });
//         });
//       };
//       subscribeToScene();
//     }
//   }, [firebaseInstance, experiment, projectId]);

//   return (
//     <Stack fullHeight>
//       <PanelToolbar></PanelToolbar>
//       <iframe
//         ref={iframeRef}
//         src="/threejs/editor/index.html"
//         style={{ width: '100%', height: '100%', border: 'none' }}
//       ></iframe>
//     </Stack>
//   );
// }

function initPanel(crash: ReturnType<typeof useCrash>, context: PanelExtensionContext) {
  ReactDOM.render(
    <StrictMode>
      <CaptureErrorBoundary onError={crash}>
        <ThemeProvider isDark>
          <SceneEditor context={context}/>
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

export type ExtendedPanelExtensionContext = PanelExtensionContext & {
  sceneJson?: string;
};
function NstrumentaSceneEditorPanelAdapter(props: Props) {
  const crash = useCrash();
  const boundInitPanel = useMemo(() => initPanel.bind(undefined, crash), [crash]);
  const { firebaseInstance, experiment, projectId } = useNstrumentaContext();

  const [sceneJson, setSceneJson] = useState();

  useEffect(() => {
    if (firebaseInstance && experiment && projectId) {
      const subscribeToScene = async () => {
        const dataCollectionPath = `projects/${projectId}/data`;

        const db = getFirestore(firebaseInstance.app);
        const collectionRef = collection(db, dataCollectionPath); // e.g., projects/{projectId}/data

        onSnapshot(collectionRef, (snapshot) => {
          snapshot.docChanges().forEach(async (change) => {
            // Handle document changes here
            const docData = change.doc.data();

            if (experiment.sceneFile == docData.filePath) {
              const sourceUrl = await getDownloadURL(
                ref(firebaseInstance!.storage, docData.filePath)
              );

              // Fetch the scene JSON from the source URL
              const response = await fetch(sourceUrl);
              setSceneJson(await response.json());
            }
          });
        });
      };

      subscribeToScene();
    }
  }, [firebaseInstance, experiment, projectId]);


  return (
    <PanelExtensionAdapter
      config={props.config}
      saveConfig={props.saveConfig}
      initPanel={(context) => {
        // Extend the context with sceneJson
        const extendedContext: ExtendedPanelExtensionContext = {
          ...context,
          sceneJson,
        };
        boundInitPanel(extendedContext);
      }}
    />
  );
}

NstrumentaSceneEditorPanelAdapter.panelType = 'Indicator';
NstrumentaSceneEditorPanelAdapter.defaultConfig = {};

export default Panel(NstrumentaSceneEditorPanelAdapter);
