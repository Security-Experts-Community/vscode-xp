import { lazy, useEffect } from 'react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router-dom';
import { usePostMessage } from './hooks/use-post-message';
import { ThemeProvider } from './providers/theme-provider';
import { TranslationsProvider } from './providers/translations-provider';
import { type PageName } from './types';

import './styles/index.scss';

const UnitTestEditor = lazy(() => import('./pages/unit-test-editor'));
const TableListEditor = lazy(() => import('./pages/table-list-editor'));
const MetaInfoEditor = lazy(() => import('./pages/meta-info-editor'));

const routes: ({ path: `/${PageName}` } & RouteObject)[] = [
  { path: '/unit-test-editor', element: <UnitTestEditor /> },
  { path: '/table-list-editor', element: <TableListEditor /> },
  { path: '/meta-info-editor', element: <MetaInfoEditor /> }
];

const router = createMemoryRouter(routes, { initialEntries: [`/${window.__webview.initialPage}`] });

function App() {
  const postMessage = usePostMessage();

  useEffect(() => {
    postMessage({ command: 'documentIsReady' });
  }, [postMessage]);

  return (
    <TranslationsProvider>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </TranslationsProvider>
  );
}

export default App;
