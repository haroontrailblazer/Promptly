import type { CSSProperties } from 'react';
import { useOverlayStore } from './store';
import { COMPONENT_LABELS } from '../scorer';
import { getEditorText } from '../content/editor';
import { DiffView } from './DiffView';
import type { Component } from '../shared/types';

export function Card({ style }: { style: CSSProperties }) {
  const { analysis, editor, improve, startImprove, acceptImprove, dismissImprove } =
    useOverlayStore();
  if (!analysis) return null;

  const score = analysis.score.overall;
  const band = score >= 80 ? 'pl-good' : score >= 50 ? 'pl-mid' : 'pl-low';
  const bandLabel = score >= 80 ? 'Strong' : score >= 50 ? 'Okay' : 'Weak';
  const showDiff = improve.status !== 'idle' && improve.text !== undefined;

  return (
    <div className="pl-card" style={style}>
      <div className="pl-head">
        <div>
          <div className="pl-kicker">Prompt score</div>
          <div className="pl-score-big">
            {score}
            <span className={`pl-band ${band}`}>{bandLabel}</span>
          </div>
        </div>
        {!showDiff && (
          <button className="pl-improve-btn" onClick={() => void startImprove()}>
            Improve
          </button>
        )}
      </div>

      {showDiff ? (
        <>
          {improve.status === 'loading' && <div className="pl-spin">Improving with cloud…</div>}
          <DiffView original={editor ? getEditorText(editor) : ''} improved={improve.text ?? ''} />
          {improve.error && <div className="pl-error">{improve.error}</div>}
          <div className="pl-actions">
            <button className="pl-dismiss" onClick={dismissImprove}>
              Dismiss
            </button>
            <button
              className="pl-copy"
              onClick={() => void navigator.clipboard.writeText(improve.text ?? '').catch(() => {})}
            >
              Copy
            </button>
            <button className="pl-accept" onClick={acceptImprove}>
              Accept
            </button>
          </div>
        </>
      ) : (
        <>
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
      )}
    </div>
  );
}
