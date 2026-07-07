import { createRoot } from 'react-dom/client';
import { App } from './App';
import css from './overlay.css?inline';

let mounted = false;

export function mountOverlay(): void {
  if (mounted || document.querySelector('promptly-root')) return;
  mounted = true;
  const host = document.createElement('promptly-root');
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = css;
  shadow.appendChild(style);
  const rootEl = document.createElement('div');
  shadow.appendChild(rootEl);
  document.documentElement.appendChild(host);
  createRoot(rootEl).render(<App />);
}
