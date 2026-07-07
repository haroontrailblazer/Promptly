import type { CSSProperties } from 'react';

interface Props {
  score: number;
  style: CSSProperties;
  onClick: () => void;
}

export function Badge({ score, style, onClick }: Props) {
  const band = score >= 80 ? 'pl-green' : score >= 50 ? 'pl-amber' : 'pl-red';
  return (
    <button
      className={`pl-badge ${band}`}
      style={style}
      onClick={onClick}
      title="Promptly — prompt score"
    >
      {score}
    </button>
  );
}
