import type { AnalysisResult } from '../shared/types';
import { improveLocally } from './local';

// Strip conversational filler so the core reads as a direct instruction —
// "can you please make website" → "make website".
const FILLERS: [RegExp, string][] = [
  [/^\s*(hi|hello|hey)[,!.\s]+/i, ''],
  [/^\s*(can|could|would|will)\s+you\s+(please\s+)?/i, ''],
  [/^\s*i\s+(want|need|would like)\s+(you\s+to\s+)?/i, ''],
  [/^\s*(help me\s+(to\s+)?)/i, ''],
  [/\b(please|kindly)\s+/gi, ''],
];

function stripFillers(text: string): string {
  let out = text;
  for (const [re, rep] of FILLERS) out = out.replace(re, rep);
  return out.trim();
}

const sentenceCase = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// compromise is a ~300 KB open-source tokenizer/NLP library — load it only
// when Improve is actually clicked, never on the typing path.
let nlpPromise: Promise<typeof import('compromise') | null> | undefined;

function loadNlp() {
  nlpPromise ??= import('compromise').catch(() => null);
  return nlpPromise;
}

// Tokenizer pass: normalize the leading verb to an imperative ("making a
// website" → "make a website"). Conservative by design — any failure or
// surprise falls back to the untouched text.
async function tokenizerPolish(core: string): Promise<string> {
  const mod = await loadNlp();
  if (!mod) return core;
  try {
    const doc = mod.default(core);
    // .first() widens to the base View in compromise's typings, but the verb
    // methods exist at runtime on views produced by verbs().
    const firstVerb = doc.verbs().first() as unknown as {
      found: boolean;
      toInfinitive: () => void;
    };
    if (firstVerb.found) {
      firstVerb.toInfinitive();
      const text = doc.text().trim();
      if (text) return text;
    }
  } catch {
    /* tokenizer is best-effort */
  }
  return core;
}

/**
 * The built-in rewrite pipeline: filler stripping + tokenizer normalization
 * on weak prompts, then the rule-based scaffolder. Strong prompts pass
 * through improveLocally untouched so the diff stays honest.
 */
export async function improveSmart(prompt: string, analysis: AnalysisResult): Promise<string> {
  const trimmed = prompt.trim();
  const weak = analysis.findings.some(
    (f) => f.checkId.startsWith('clarity') || f.checkId === 'objective-missing',
  );
  if (!weak) return improveLocally(trimmed, analysis);

  const stripped = stripFillers(trimmed);
  const core = stripped.length >= 3 ? sentenceCase(await tokenizerPolish(stripped)) : trimmed;
  return improveLocally(core, analysis);
}
