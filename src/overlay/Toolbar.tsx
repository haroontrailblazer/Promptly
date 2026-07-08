import type { CSSProperties } from 'react';
import { useOverlayStore } from './store';

// Thick single-stroke "P" letterform (monochrome mark).
export function PMark({ size = 15 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="3.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 20V4h5a4.5 4.5 0 0 1 0 9H8" />
    </svg>
  );
}

function Sparkle() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5l2.1 6.1 6.4.4-5 4 1.6 6.2L12 15.7l-5.1 3.5L8.5 13l-5-4 6.4-.4L12 2.5z" />
    </svg>
  );
}

function Book() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

// Pretty-Prompt-style pill toolbar anchored above the prompt input.
export function Toolbar({ style }: { style: CSSProperties }) {
  const { analysis, openPanel, startImprove } = useOverlayStore();
  const score = analysis?.score.overall ?? null;
  const band = score === null ? '' : score >= 80 ? 'pl-good' : score >= 50 ? 'pl-mid' : 'pl-low';

  const improveNow = () => {
    openPanel('improve');
    void startImprove();
  };
  const openSettings = () =>
    void chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' }).catch(() => {});

  return (
    <div className="pl-badge-wrap" style={style}>
      <button
        className="pl-tool pl-badge"
        title="Promptly — prompt breakdown"
        aria-label="Promptly: open prompt breakdown"
        onClick={() => openPanel('breakdown')}
      >
        <PMark />
      </button>
      <button
        className="pl-tool pl-improve-btn"
        title="Improve prompt"
        aria-label="Improve prompt"
        onClick={improveNow}
      >
        <Sparkle />
      </button>
      <button
        className="pl-tool pl-library-btn"
        title="Prompt Library"
        aria-label="Open the prompt library"
        onClick={() => openPanel('library')}
      >
        <Book />
      </button>
      {score !== null && (
        <button
          className={`pl-score ${band}`}
          title={`Prompt score ${score} — open breakdown`}
          onClick={() => openPanel('breakdown')}
        >
          {score}
        </button>
      )}
      <button
        className="pl-tool pl-menu"
        title="Promptly settings"
        aria-label="Promptly settings"
        onClick={openSettings}
      >
        ⋯
      </button>
    </div>
  );
}
