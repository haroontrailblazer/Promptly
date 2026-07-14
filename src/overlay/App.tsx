import { useEffect, useRef, useState } from 'react';
import { useOverlayStore } from './store';
import { Toolbar } from './Toolbar';
import { Card } from './Card';

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

const TOOLBAR_W = 182;
const PANEL_W = 350;

export function App() {
  const { anchor, cardOpen, settings, panelPos, tab } = useOverlayStore();
  const cardEl = useRef<HTMLDivElement | null>(null);
  const [panelH, setPanelH] = useState(360);

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

  // The panel's height depends on the active tab and content — measure it so
  // positioning can keep the whole panel inside the viewport.
  useEffect(() => {
    const el = cardEl.current;
    if (!cardOpen || !el) return;
    const update = () => setPanelH(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cardOpen, tab]);

  if (!anchor) return null;

  const dark = settings.theme === 'dark' || (settings.theme === 'system' && sysDark);
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Toolbar floats just above the input's top-right corner, Pretty-Prompt style.
  const toolLeft = clamp(anchor.right - TOOLBAR_W, 8, vw - TOOLBAR_W - 8);
  const toolTop = clamp(anchor.top - 40, 8, vh - 44);

  // Panel: prefer above the input; flip below when there's no room, and always
  // top-anchor with clamping so it can never clip past the viewport edges.
  const above = toolTop - panelH - 8;
  const autoTop = clamp(above >= 8 ? above : anchor.bottom + 8, 8, Math.max(8, vh - panelH - 8));
  const autoLeft = clamp(anchor.right - PANEL_W, 8, Math.max(8, vw - PANEL_W - 8));

  const panelStyle = panelPos
    ? {
        left: clamp(panelPos.x, 4, Math.max(4, vw - 64)),
        top: clamp(panelPos.y, 4, Math.max(4, vh - 48)),
      }
    : { left: autoLeft, top: autoTop };

  return (
    <div className={`pl-layer${dark ? ' pl-dark' : ''}`}>
      <Toolbar style={{ left: toolLeft, top: toolTop }} />
      {cardOpen && <Card style={panelStyle} innerRef={cardEl} />}
    </div>
  );
}
