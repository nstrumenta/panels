// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { last } from 'lodash';
import { useCallback, useEffect, useLayoutEffect, useReducer, useState } from 'react';

import { Quaternion } from 'three';

import { useRef } from 'react';

import { RosPath } from '@base/components/MessagePathSyntax/constants';
import parseRosPath from '@base/components/MessagePathSyntax/parseRosPath';
import { simpleGetMessagePathDataItems } from '@base/components/MessagePathSyntax/simpleGetMessagePathDataItems';
import Stack from '@base/components/Stack';
import { SettingsTreeAction, MessageEvent as StudioMessageEvent } from '@foxglove/studio';

import { useNstrumentaContext } from '@base/context/NstrumentaContext';
import Logger from '@foxglove/log';
import { collection, getFirestore, onSnapshot, query, where } from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';
import { ExtendedPanelExtensionContext } from '.';
import { settingsActionReducer, useSettingsTree } from './settings';
import { Config } from './types';

const log = Logger.getLogger('SceneEditor');

type Props = {
  context: ExtendedPanelExtensionContext;
  sceneJson?: string;
};

const defaultConfig: Config = {
  path: '',
};

type State = {
  path: string;
  parsedPath: RosPath | undefined;
  latestMessage: StudioMessageEvent<unknown> | undefined;
  latestMatchingQueriedData: unknown | undefined;
  error: Error | undefined;
  pathParseError: string | undefined;
};

type Action =
  | { type: 'frame'; messages: readonly StudioMessageEvent<unknown>[] }
  | { type: 'path'; path: string }
  | { type: 'seek' };

function getSingleDataItem(results: unknown[]) {
  if (results.length <= 1) {
    return results[0];
  }
  throw new Error('Message path produced multiple results');
}

function reducer(state: State, action: Action): State {
  try {
    switch (action.type) {
      case 'frame': {
        if (state.pathParseError != undefined) {
          return { ...state, latestMessage: last(action.messages), error: undefined };
        }
        let latestMatchingQueriedData = state.latestMatchingQueriedData;
        let latestMessage = state.latestMessage;
        if (state.parsedPath) {
          for (const message of action.messages) {
            if (message.topic !== state.parsedPath.topicName) {
              continue;
            }
            const data = getSingleDataItem(
              simpleGetMessagePathDataItems(message, state.parsedPath)
            );
            if (data != undefined) {
              latestMatchingQueriedData = data;
              latestMessage = message;
            }
          }
        }
        return { ...state, latestMessage, latestMatchingQueriedData, error: undefined };
      }
      case 'path': {
        const newPath = parseRosPath(action.path);
        let pathParseError: string | undefined;
        if (
          newPath?.messagePath.some(
            (part) =>
              (part.type === 'filter' && typeof part.value === 'object') ||
              (part.type === 'slice' &&
                (typeof part.start === 'object' || typeof part.end === 'object'))
          ) === true
        ) {
          pathParseError = 'Message paths using variables are not currently supported';
        }
        let latestMatchingQueriedData: unknown | undefined;
        let error: Error | undefined;
        try {
          latestMatchingQueriedData =
            newPath && pathParseError == undefined && state.latestMessage
              ? getSingleDataItem(simpleGetMessagePathDataItems(state.latestMessage, newPath))
              : undefined;
        } catch (err) {
          error = err;
        }
        return {
          ...state,
          path: action.path,
          parsedPath: newPath,
          latestMatchingQueriedData,
          error,
          pathParseError,
        };
      }
      case 'seek':
        return {
          ...state,
          latestMessage: undefined,
          latestMatchingQueriedData: undefined,
          error: undefined,
        };
    }
  } catch (error) {
    return { ...state, latestMatchingQueriedData: undefined, error };
  }
}

export function SceneEditor({ context }: Props): JSX.Element {
  // panel extensions must notify when they've completed rendering
  // onRender will setRenderDone to a done callback which we can invoke after we've rendered
  const [renderDone, setRenderDone] = useState<() => void>(() => () => {});

  const { firebaseInstance, experiment, projectId } = useNstrumentaContext();

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('Received message from iframe:', event.data);
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const [config, setConfig] = useState(() => ({
    ...defaultConfig,
    ...(context.initialState as Partial<Config>),
  }));

  const [state, dispatch] = useReducer(
    reducer,
    config,
    ({ path }): State => ({
      path,
      parsedPath: parseRosPath(path),
      latestMessage: undefined,
      latestMatchingQueriedData: undefined,
      pathParseError: undefined,
      error: undefined,
    })
  );

  useLayoutEffect(() => {
    dispatch({ type: 'path', path: config.path });
  }, [config.path]);

  useEffect(() => {
    context.saveState(config);
    context.setDefaultPanelTitle(config.path === '' ? undefined : config.path);
  }, [config, context]);

  useEffect(() => {
    if (iframeRef.current && context.sceneJson) {
      iframeRef.current.contentWindow?.postMessage(
        {
          type: 'editor iFrame setState',
          state: context.sceneJson,
        },
        '*'
      );
    }
  }, [context.sceneJson, iframeRef]);

  useEffect(() => {
    context.onRender = (renderState, done) => {
      setRenderDone(() => done);

      if (renderState.didSeek === true) {
        dispatch({ type: 'seek' });
      }

      if (renderState.currentFrame) {
        dispatch({ type: 'frame', messages: renderState.currentFrame });
      }
    };
    context.watch('currentFrame');
    context.watch('didSeek');

    return () => {
      context.onRender = undefined;
    };
  }, [context]);

  const settingsActionHandler = useCallback(
    (action: SettingsTreeAction) =>
      setConfig((prevConfig) => settingsActionReducer(prevConfig, action)),
    [setConfig]
  );

  const settingsTree = useSettingsTree(config, state.pathParseError, state.error?.message);
  useEffect(() => {
    context.updatePanelSettingsEditor({
      actionHandler: settingsActionHandler,
      nodes: settingsTree,
    });
  }, [context, settingsActionHandler, settingsTree]);

  useEffect(() => {
    if (state.parsedPath?.topicName != undefined) {
      context.subscribe([state.parsedPath.topicName]);
    }
    return () => context.unsubscribeAll();
  }, [context, state.parsedPath?.topicName]);

  // update GameScene with latestMessage
  useEffect(() => {
    if (state.latestMessage && iframeRef.current) {
      console.log(state.latestMessage.message);
      const fusion = (state.latestMessage.message as { values: number[] }).values;
      //create a transform with rotoation from quaternion fusion
      const rotationQuaternion = new Quaternion(fusion[1], fusion[2], fusion[3], fusion[0]);
      //set the transform to the scene
      iframeRef.current.contentWindow?.postMessage(
        {
          type: 'editor iFrame setObjectPositionRotationScale',
          objectName: 'Cube',
          rotationQuaternion,
        },
        '*'
      );

      // const q = new Quaternion(fusion[1], fusion[2], fusion[3], fusion[0]);
      // scene.mesh.setRotationFromQuaternion(q);
      // scene.renderer.render(scene.scene, scene.camera);
    }
  }, [iframeRef, state.latestMessage]);

  //subscribe to firebase scene changes
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
              // Post message to iframe with new scene data
              if (iframeRef.current) {
                const sourceUrl = await getDownloadURL(
                  ref(firebaseInstance!.storage, docData.filePath)
                );

                // Fetch the scene JSON from the source URL
                const response = await fetch(sourceUrl);
                iframeRef.current.contentWindow?.postMessage(
                  {
                    type: 'editor iFrame setState',
                    state: response.ok ? await response.json() : {},
                  },
                  '*'
                );
              }
            }
          });
        });
      };
      subscribeToScene();
    }
  }, [firebaseInstance, experiment, projectId]);

  // Indicate render is complete - the effect runs after the dom is updated
  useEffect(() => {
    renderDone();
  }, [renderDone]);

  const injectScriptIntoIframe = () => {
    if (iframeRef.current) {
      const script = document.createElement('script');
      script.src = '/scripts/editorMessagePassing.js';
      iframeRef.current.contentDocument?.body.appendChild(script);
    }
  };

  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.onload = injectScriptIntoIframe;
    }
  }, []);

  const runScriptInIframe = (script: string) => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage({ type: 'runScript', script }, '*');
    }
  };

  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  useEffect(() => {
    if (firebaseInstance) {
      setIsFirebaseReady(true);
    }
  }, [firebaseInstance]);

  const subscribeToScene = useCallback(async () => {
    const db = getFirestore(firebaseInstance!.app);

    const dataCollectionPath = `projects/${projectId}/data`;
    const collectionRef = collection(db, dataCollectionPath);
    const filteredQuery = query(collectionRef, where('dirname', '==', experiment!.dirname));

    onSnapshot(filteredQuery, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        // Handle document changes here
        const docData = change.doc.data();
        if (change.type === 'added') {
          // Document added
          log.debug('Document added:', docData.filePath);
        }
        if (change.type === 'modified') {
          // Document modified
          log.debug('Document modified:', docData);
          if (docData.filePath.endsWith('.scene.json')) {
            // Post message to iframe with new scene data
            if (iframeRef.current) {
              iframeRef.current.contentWindow?.postMessage(
                { type: 'editor iFrame setState', state: docData },
                '*'
              );
            }
          }
        }
        if (change.type === 'removed') {
          // Document removed
          log.debug('Document removed:', docData);
        }
      });
    });
  }, [experiment, firebaseInstance, projectId]);

  useEffect(() => {
    if (isFirebaseReady && experiment) {
      subscribeToScene();
    }
  }, [isFirebaseReady, experiment, subscribeToScene]);

  return (
    <Stack fullHeight>
      <iframe
        ref={iframeRef}
        src="/threejs/editor/index.html"
        style={{ width: '100%', height: '100%', border: 'none' }}
      ></iframe>
      <button onClick={() => runScriptInIframe('console.log("Hello from parent!");')}>
        Run Script in Iframe
      </button>
    </Stack>
  );
}
