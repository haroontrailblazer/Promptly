import DiffMatchPatch from 'diff-match-patch';

export function diffParts(a: string, b: string): { op: -1 | 0 | 1; text: string }[] {
  const dmp = new DiffMatchPatch();
  const diffs = dmp.diff_main(a, b);
  dmp.diff_cleanupSemantic(diffs);
  return diffs.map(([op, text]) => ({ op: op as -1 | 0 | 1, text }));
}
