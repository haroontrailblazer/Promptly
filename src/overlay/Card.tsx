import {
  useEffect,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useOverlayStore, type PanelTab } from './store';
import { COMPONENT_LABELS } from '../scorer';
import { getEditorText } from '../content/editor';
import { DiffView } from './DiffView';
import { PMark } from './Toolbar';
import { AccountView, LibraryView } from './Library';
import type { Component } from '../shared/types';

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

const TABS: { id: PanelTab; label: string }[] = [
  { id: 'improve', label: 'Improve' },
  { id: 'refine', label: 'Refine' },
  { id: 'breakdown', label: 'Breakdown' },
  { id: 'library', label: 'Library' },
];

function ProgressSteps() {
  const platform = useOverlayStore((s) => s.analysis?.platform);
  const steps = [
    'Reading your prompt',
    `Optimising for ${platform?.name ?? 'this assistant'}`,
    platform?.kind === 'agent' ? 'Adding targets and acceptance criteria' : 'Resolving ambiguities',
    'Applying best practices',
    'Polishing',
  ];
  const [n, setN] = useState(1);
  useEffect(() => {
    const t = window.setInterval(() => setN((v) => Math.min(v + 1, steps.length)), 600);
    return () => window.clearInterval(t);
  }, [steps.length]);
  return (
    <div className="pl-steps">
      {steps.slice(0, n).map((s, i) => (
        <div className={`pl-step${i < n - 1 ? ' pl-step-done' : ''}`} key={s}>
          <span className="pl-step-dot" />
          {s}
        </div>
      ))}
    </div>
  );
}

export function Card({
  style,
  innerRef,
}: {
  style: CSSProperties;
  innerRef?: React.Ref<HTMLDivElement>;
}) {
  const {
    analysis,
    editor,
    improve,
    tab,
    account,
    setTab,
    closePanel,
    setPanelPos,
    startImprove,
    refine,
    acceptImprove,
    dismissImprove,
  } = useOverlayStore();
  const [instruction, setInstruction] = useState('');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const copyImproved = () => {
    navigator.clipboard
      .writeText(improve.text ?? '')
      .then(() => setCopyState('copied'))
      .catch(() => setCopyState('failed'));
    window.setTimeout(() => setCopyState('idle'), 1600);
  };

  const original = editor ? getEditorText(editor) : '';
  const hasResult = improve.status !== 'idle' && improve.text !== undefined;
  const unchanged = hasResult && (improve.text ?? '').trim() === original.trim();
  const score = analysis?.score.overall ?? null;
  const band = score === null ? '' : score >= 80 ? 'pl-good' : score >= 50 ? 'pl-mid' : 'pl-low';
  const bandLabel = score === null ? '' : score >= 80 ? 'Strong' : score >= 50 ? 'Okay' : 'Weak';

  const selectTab = (t: PanelTab) => {
    setTab(t);
    if (t === 'improve' && improve.status === 'idle') void startImprove();
  };

  // The whole header drags the panel (buttons excluded).
  const onHeaderDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const panel = (e.currentTarget as HTMLElement).closest('.pl-card') as HTMLElement;
    const rect = panel.getBoundingClientRect();
    const dx = e.clientX - rect.left;
    const dy = e.clientY - rect.top;
    const move = (ev: PointerEvent) =>
      setPanelPos({
        x: clamp(ev.clientX - dx, 4, window.innerWidth - rect.width - 4),
        y: clamp(ev.clientY - dy, 4, window.innerHeight - 48),
      });
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    e.preventDefault();
  };

  const emptyState = (
    <div className="pl-empty-state">
      <PMark size={26} />
      <b>No prompt found</b>
      <span>Start writing your prompt, then click ✨ Improve.</span>
    </div>
  );

  const resultView = (
    <>
      {improve.status === 'loading' && <ProgressSteps />}
      {hasResult &&
        (unchanged ? (
          <div className="pl-empty">Your prompt is already strong — nothing to change.</div>
        ) : (
          <DiffView original={original} improved={improve.text ?? ''} />
        ))}
      {improve.error && <div className="pl-error">{improve.error}</div>}
      {improve.note && !unchanged && <div className="pl-note">{improve.note}</div>}
      {hasResult && (
        <div className="pl-actions">
          <button className="pl-dismiss" onClick={dismissImprove}>
            Dismiss
          </button>
          {!unchanged && (
            <>
              <button className="pl-copy" onClick={copyImproved}>
                {copyState === 'copied'
                  ? 'Copied ✓'
                  : copyState === 'failed'
                    ? 'Copy failed'
                    : 'Copy'}
              </button>
              <button className="pl-accept" onClick={acceptImprove}>
                Accept
              </button>
            </>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className="pl-card" style={style} ref={innerRef}>
      <div className="pl-panel-head" onPointerDown={onHeaderDown}>
        <div className="pl-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`pl-tab${tab === t.id ? ' pl-tab-active' : ''}`}
              onClick={() => selectTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="pl-head-right">
          <button
            className={`pl-account${tab === 'account' ? ' pl-tab-active' : ''}`}
            title={account ? `Signed in as ${account}` : 'Sign in to sync your library'}
            onClick={() => setTab('account')}
          >
            {account ? account[0].toUpperCase() : 'Sign in'}
          </button>
          <button
            className="pl-close"
            title="Close"
            aria-label="Close Promptly panel"
            onClick={closePanel}
          >
            ×
          </button>
        </div>
      </div>

      {tab === 'improve' &&
        (!analysis ? (
          emptyState
        ) : improve.status === 'idle' ? (
          <div className="pl-empty-state">
            <PMark size={26} />
            <b>Ready to improve</b>
            <span>Rewrite this prompt with structure, role, and constraints.</span>
            <button className="pl-accept pl-run" onClick={() => void startImprove()}>
              Improve now
            </button>
          </div>
        ) : (
          resultView
        ))}

      {tab === 'refine' && (
        <>
          {original.trim() ? (
            <>
              <textarea
                className="pl-refine-input"
                placeholder="Tell Promptly how to change this prompt — e.g. make it formal, add examples, shorten it…"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
              />
              <div className="pl-actions">
                <button
                  className="pl-accept pl-refine-btn"
                  onClick={() => void refine(instruction)}
                >
                  Refine
                </button>
              </div>
            </>
          ) : (
            emptyState
          )}
          {resultView}
        </>
      )}

      {tab === 'breakdown' &&
        (analysis ? (
          <>
            <div className="pl-score-big">
              {score}
              <span className={`pl-band ${band}`}>{bandLabel}</span>
            </div>
            <div className="pl-sec">Breakdown</div>
            {(Object.entries(COMPONENT_LABELS) as [Component, string][]).map(([key, label]) => (
              <div className="pl-bar-row" key={key}>
                <span className="pl-bar-label">{label}</span>
                <span className="pl-bar">
                  <span
                    className="pl-bar-fill"
                    style={{ width: `${analysis.score.components[key]}%` }}
                  />
                </span>
              </div>
            ))}
            {analysis.findings.length > 0 && <div className="pl-sec">Suggestions</div>}
            {analysis.findings.map((f) => (
              <div className="pl-suggestion" key={f.checkId}>
                <b>{f.message}</b>
                <span>{f.suggestion}</span>
              </div>
            ))}
            {analysis.findings.length === 0 && (
              <div className="pl-empty">Looks great — nothing to suggest.</div>
            )}
          </>
        ) : (
          emptyState
        ))}

      {tab === 'library' && <LibraryView />}
      {tab === 'account' && <AccountView />}
    </div>
  );
}
