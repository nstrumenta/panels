// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useEffect, useState } from 'react';

import { useRef } from 'react';

import Stack from '@base/components/Stack';

import { useNstrumentaContext } from '@base/context/NstrumentaContext';
import Logger from '@foxglove/log';
import { collection, getFirestore, onSnapshot } from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';
import useMessagesByPath from '@base/components/MessagePathSyntax/useMessagesByPath';
import { Quaternion } from 'three';

const log = Logger.getLogger('SceneEditor');

export function SceneEditor(): JSX.Element {
  const { firebaseInstance, experiment, projectId } = useNstrumentaContext();

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [paths, setPaths] = useState<string[]>([]); // Paths to subscribe to
  const itemsByPath = useMessagesByPath(paths); // Subscribed messages by path

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      log.debug('Received message from iframe:', event.data);
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Subscribe to Firebase scene changes
  useEffect(() => {
    if (firebaseInstance && experiment && projectId) {
      const subscribeToScene = async () => {
        const dataCollectionPath = `projects/${projectId}/data`;

        const db = getFirestore(firebaseInstance.app);
        const collectionRef = collection(db, dataCollectionPath);

        onSnapshot(collectionRef, (snapshot) => {
          snapshot.docChanges().forEach(async (change) => {
            const docData = change.doc.data();

            if (experiment.sceneFile == docData.filePath) {
              if (iframeRef.current) {
                const sourceUrl = await getDownloadURL(
                  ref(firebaseInstance!.storage, docData.filePath)
                );

                const response = await fetch(sourceUrl);
                const sceneJson = await response.json();

                iframeRef.current.contentWindow?.postMessage(
                  {
                    type: 'editor iFrame setState',
                    state: sceneJson,
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

  // Inject script into iframe
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

  // Example paths to subscribe to
  useEffect(() => {
    setPaths(['fusion']); // Replace with actual paths
  }, []);

  // Handle messages from subscribed paths
  useEffect(() => {
    if (itemsByPath) {
      Object.entries(itemsByPath).forEach(([path, messages]) => {
        log.debug(`Messages for path ${path}:`, messages);

        // make positon and rotation from fusion message
        const fusion = (messages[0].messageEvent.message as unknown as { values: number[] }).values;

        //create a transform with rotoation from quaternion fusion
        const rotationQuaternion = new Quaternion(fusion[1], fusion[2], fusion[3], fusion[0]);
        //set the transform to the scene
        if (!iframeRef.current) return;
        iframeRef.current.contentWindow?.postMessage(
          {
            type: 'editor iFrame setObjectPositionRotationScale',
            objectName: 'Cube',
            rotationQuaternion,
          },
          '*'
        );
      });
    }
  }, [itemsByPath]);

  return (
    <Stack fullHeight>
      <iframe
        ref={iframeRef}
        src="/threejs/editor/index.html"
        style={{ width: '100%', height: '100%', border: 'none' }}
      ></iframe>
    </Stack>
  );
}
