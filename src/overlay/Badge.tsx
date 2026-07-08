import type { CSSProperties } from 'react';

interface Props {
  score: number;
  style: CSSProperties;
  onClick: () => void;
}

// Thick single-stroke "P" letterform (Grammarly-style mark, monochrome).
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
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M8 20V4h5a4.5 4.5 0 0 1 0 9H8" />
        </svg>
      </button>
      <span className={`pl-score ${band}`}>{score}</span>
    </div>
  );
}
