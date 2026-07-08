import type { CSSProperties } from 'react';

interface Props {
  score: number;
  style: CSSProperties;
  onClick: () => void;
}

export function Badge({ score, style, onClick }: Props) {
  const band = score >= 80 ? 'pl-good' : score >= 50 ? 'pl-mid' : 'pl-low';
  return (
    <div className="pl-badge-wrap" style={style}>
      <button
        className="pl-badge"
        onClick={onClick}
        title={`Promptly — prompt score ${score}`}
        aria-label={`Promptly, prompt score ${score}. Open suggestions.`}
      >
        P
      </button>
      <span className={`pl-score ${band}`}>{score}</span>
    </div>
  );
}
