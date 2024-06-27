// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Suspense, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import GlobalCss from './components/GlobalCss';
import EventsProvider from './providers/EventsProvider';
import NstrumentaProvider from './providers/NstrumentaProvider';
import { StudioLogsSettingsProvider } from './providers/StudioLogsSettingsProvider';
import TimelineInteractionStateProvider from './providers/TimelineInteractionStateProvider';

import Workspace from './Workspace';
import { ColorSchemeThemeProvider } from './components/ColorSchemeThemeProvider';
import CssBaseline from './components/CssBaseline';
import DocumentTitleAdapter from './components/DocumentTitleAdapter';
import ErrorBoundary from './components/ErrorBoundary';
import PlayerManager from './components/PlayerManager';
import SendNotificationToastAdapter from './components/SendNotificationToastAdapter';
import StudioToastProvider from './components/StudioToastProvider';
import AppConfigurationContext from './context/AppConfigurationContext';
import CurrentLayoutProvider from './providers/CurrentLayoutProvider';
import LayoutManagerProvider from './providers/LayoutManagerProvider';
import PanelCatalogProvider from './providers/PanelCatalogProvider';
import UserProfileLocalStorageProvider from './providers/UserProfileLocalStorageProvider';

import { useMemo, useState } from 'react';

import { AppSetting } from './AppSetting';

import { FirebaseApp, initializeApp } from 'firebase/app';
import { Auth, User, getAuth, onAuthStateChanged } from 'firebase/auth';
import { FirebaseStorage, getStorage } from 'firebase/storage';
import NstrumentaDataSourceFactory from './dataSources/NstrumentaDataSourceFactory';
import ExtensionCatalogProvider from './providers/ExtensionCatalogProvider';
import ExtensionMarketplaceProvider from './providers/ExtensionMarketplaceProvider';
import LocalStorageAppConfiguration from './services/LocalStorageAppConfiguration';

export type FirebaseInstance = {
  app: FirebaseApp;
  storage: FirebaseStorage;
  auth: Auth;
  user?: User;
};

// Suppress context menu for the entire app except on inputs & textareas.
function contextMenuHandler(event: MouseEvent) {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
    return;
  }

  event.preventDefault();
  return false;
}

export function App(): JSX.Element {
  const appConfiguration = useMemo(
    () =>
      new LocalStorageAppConfiguration({
        defaults: {
          [AppSetting.SHOW_DEBUG_PANELS]: true,
        },
      }),
    []
  );

  const { search } = window.location;

  const nstrumentaOrg = new URLSearchParams(search).get('org') ?? '';

  const firebaseConfigPath = `https://storage.googleapis.com/${nstrumentaOrg}-config/firebaseConfig.json`;

  const [firebaseInstance, setFirebaseInstance] = useState<FirebaseInstance>();

  const fetchConfig = async () => {
    const fetchedFirebaseConfig = await (await fetch(firebaseConfigPath)).json();
    console.log(fetchedFirebaseConfig);
    const app = initializeApp(fetchedFirebaseConfig);
    const storage = getStorage(app);
    const auth = getAuth(app);

    onAuthStateChanged(auth, (nextUser) => {
      if (nextUser) {
        setFirebaseInstance({ app, storage, auth, user: nextUser });
      } else {
        setFirebaseInstance({ app, storage, auth, user: undefined });
      }
    });
  };

  const dataSources = useMemo(() => {
    if (!firebaseInstance) return [];
    const sources = [new NstrumentaDataSourceFactory(firebaseInstance)];

    return sources;
  }, [firebaseInstance]);

  const init = async () => {
    await fetchConfig();
  };

  useEffect(() => {
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.addEventListener('contextmenu', contextMenuHandler);
    return () => document.removeEventListener('contextmenu', contextMenuHandler);
  }, []);

  return (
    <AppConfigurationContext.Provider value={appConfiguration}>
      <ColorSchemeThemeProvider>
        <GlobalCss />
        <CssBaseline>
          <ErrorBoundary>
            <NstrumentaProvider>
              <StudioLogsSettingsProvider>
                <StudioToastProvider>
                  <UserProfileLocalStorageProvider>
                    <LayoutManagerProvider>
                      <TimelineInteractionStateProvider>
                        <CurrentLayoutProvider>
                          <ExtensionMarketplaceProvider>
                            <ExtensionCatalogProvider loaders={[]}>
                              <PlayerManager playerSources={dataSources}>
                                <EventsProvider>
                                  <DocumentTitleAdapter />
                                  <SendNotificationToastAdapter />
                                  <DndProvider backend={HTML5Backend}>
                                    <Suspense fallback={<></>}>
                                      <PanelCatalogProvider>
                                        <Workspace />
                                      </PanelCatalogProvider>
                                    </Suspense>
                                  </DndProvider>
                                </EventsProvider>
                              </PlayerManager>
                            </ExtensionCatalogProvider>
                          </ExtensionMarketplaceProvider>
                        </CurrentLayoutProvider>
                      </TimelineInteractionStateProvider>
                    </LayoutManagerProvider>
                  </UserProfileLocalStorageProvider>
                </StudioToastProvider>
              </StudioLogsSettingsProvider>
            </NstrumentaProvider>
          </ErrorBoundary>
        </CssBaseline>
      </ColorSchemeThemeProvider>
    </AppConfigurationContext.Provider>
  );
}
