import { lazy, Suspense } from 'react';
import { DropInn } from './components/DropInn/DropInn';
import './dropinn.css';

const LegacyApp = lazy(() => import('./components/DropInn/LegacyApp'));
const legacy =
  new URLSearchParams(window.location.search).get('legacy') === '1';
document.documentElement.classList.toggle('dropinn-v2', !legacy);

export default function App() {
  return legacy ? (
    <Suspense fallback={<div>Opening the table…</div>}>
      <LegacyApp />
    </Suspense>
  ) : (
    <DropInn />
  );
}
