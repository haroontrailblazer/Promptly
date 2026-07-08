import { useEffect, useState } from 'react';
import { useOverlayStore } from './store';
import { Toolbar } from './Toolbar';
import { Card } from './Card';

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

const TOOLBAR_W = 150;

export function App() {
  const { anchor, cardOpen, settings, panelPos } = useOverlayStore();

  // Follow the browser theme live, not just at mount.
  const [sysDark, setSysDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSysDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  if (!anchor) return null;

  const dark = settings.theme === 'dark' || (settings.theme === 'system' && sysDark);

  // Toolbar floats just above the input's top-right corner, Pretty-Prompt style.
  const toolLeft = clamp(anchor.right - TOOLBAR_W, 8, window.innerWidth - TOOLBAR_W - 8);
  const toolTop = clamp(anchor.top - 40, 8, window.innerHeight - 44);

  const panelStyle = panelPos
    ? { left: panelPos.x, top: panelPos.y }
    : {
        right: clamp(window.innerWidth - anchor.right, 8, Math.max(8, window.innerWidth - 366)),
        bottom: clamp(window.innerHeight - toolTop + 8, 8, window.innerHeight - 60),
      };

  return (
    <div className={`pl-layer${dark ? ' pl-dark' : ''}`}>
      <Toolbar style={{ left: toolLeft, top: toolTop }} />
      {cardOpen && <Card style={panelStyle} />}
    </div>
  );
}
