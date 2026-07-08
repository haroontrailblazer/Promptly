import { useEffect, useState } from 'react';
import { useOverlayStore } from './store';
import { Badge } from './Badge';
import { Card } from './Card';

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export function App() {
  const { analysis, anchor, cardOpen, settings, toggleCard } = useOverlayStore();

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

  if (!analysis || !anchor) return null;

  const dark = settings.theme === 'dark' || (settings.theme === 'system' && sysDark);

  const badgeLeft = clamp(anchor.right - 44, 8, window.innerWidth - 52);
  const badgeTop = clamp(anchor.bottom - 44, 8, window.innerHeight - 52);

  return (
    <div className={`pl-layer${dark ? ' pl-dark' : ''}`}>
      <Badge
        score={analysis.score.overall}
        style={{ left: badgeLeft, top: badgeTop }}
        onClick={toggleCard}
      />
      {cardOpen && (
        <Card
          style={{
            right: clamp(
              window.innerWidth - badgeLeft - 40,
              8,
              Math.max(8, window.innerWidth - 366),
            ),
            bottom: clamp(window.innerHeight - badgeTop + 12, 8, window.innerHeight - 60),
          }}
        />
      )}
    </div>
  );
}
