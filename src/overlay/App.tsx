import { useOverlayStore } from './store';
import { Badge } from './Badge';
import { Card } from './Card';

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export function App() {
  const { analysis, anchor, cardOpen, settings, toggleCard } = useOverlayStore();
  if (!analysis || !anchor) return null;

  const dark =
    settings.theme === 'dark' ||
    (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const badgeLeft = clamp(anchor.right - 40, 8, window.innerWidth - 46);
  const badgeTop = clamp(anchor.bottom - 40, 8, window.innerHeight - 46);

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
            right: clamp(window.innerWidth - badgeLeft - 38, 8, window.innerWidth - 348),
            bottom: clamp(window.innerHeight - badgeTop + 10, 8, window.innerHeight - 60),
          }}
        />
      )}
    </div>
  );
}
