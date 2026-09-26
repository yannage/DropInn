import { lazy, Suspense } from 'react';
import Merch from './components/Merch/Merch';
import './dropinn.css';

const LegacyApp = lazy(() => import('./components/DropInn/LegacyApp'));
const DropInn = lazy(() => import('./components/DropInn/DropInn').then(module => ({ default: module.DropInn })));
const merch = window.location.pathname.replace(/\/+$/, '') === '/merch';
const legacy =
  !merch && new URLSearchParams(window.location.search).get('legacy') === '1';
document.documentElement.classList.toggle('dropinn-v2', !legacy);

export default function App() {
  if (merch) return <Merch />;
  return legacy ? (
    <Suspense fallback={<div>Opening the table…</div>}>
      <LegacyApp />
    </Suspense>
  ) : (
    <Suspense fallback={<div className="di-app di-loading">Opening the inn…</div>}><DropInn /></Suspense>
  );
}
