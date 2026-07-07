import { diffParts } from './diff';

export function DiffView({ original, improved }: { original: string; improved: string }) {
  const parts = diffParts(original, improved);
  return (
    <div className="pl-diff">
      {parts.map((p, i) =>
        p.op === 1 ? <ins key={i}>{p.text}</ins> : p.op === -1 ? <del key={i}>{p.text}</del> : <span key={i}>{p.text}</span>,
      )}
    </div>
  );
}
