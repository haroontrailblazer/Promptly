import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test';
import path from 'node:path';

let context: BrowserContext;

test.beforeAll(async () => {
  const dist = path.resolve('dist-e2e');
  context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
  });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
});

test.afterAll(async () => context.close());

async function typePrompt(page: Page, selector: string, text: string) {
  await page.click(selector);
  await page.fill(selector, text).catch(async () => {
    // contenteditable has no fill(); type instead
    await page.type(selector, text);
  });
}

test('badge appears with a low score for a weak prompt (textarea)', async () => {
  const page = await context.newPage();
  await page.goto('http://localhost:4173/textarea.html');
  await typePrompt(page, '#chat', 'make website');
  await expect(page.locator('.pl-badge')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.pl-badge svg')).toHaveCount(1); // the P mark
  expect(Number(await page.locator('.pl-score').textContent())).toBeLessThan(50);
  await page.close();
});

test('score rises as the prompt improves', async () => {
  const page = await context.newPage();
  await page.goto('http://localhost:4173/textarea.html');
  await typePrompt(page, '#chat', 'make website');
  const scoreChip = page.locator('.pl-score');
  await expect(scoreChip).toBeVisible();
  const weak = Number(await scoreChip.textContent());
  await typePrompt(
    page,
    '#chat',
    'Act as a senior software engineer. Build a landing page in React with TypeScript. Output format: a single code block. It must include at least 3 sections.',
  );
  await expect(async () => {
    expect(Number(await scoreChip.textContent())).toBeGreaterThan(weak);
  }).toPass({ timeout: 5000 });
  await page.close();
});

test('card opens with suggestions; Accept replaces textarea text', async () => {
  const page = await context.newPage();
  await page.goto('http://localhost:4173/textarea.html');
  await typePrompt(page, '#chat', 'make website');
  await page.locator('.pl-badge').click();
  await expect(page.locator('.pl-card')).toBeVisible();
  await expect(page.locator('.pl-suggestion').first()).toBeVisible();
  await page.locator('.pl-improve-btn').click();
  await expect(page.locator('.pl-diff')).toBeVisible();
  await page.locator('.pl-copy').click();
  await expect(page.locator('.pl-copy')).toHaveText('Copied ✓'); // visible feedback, not a silent maybe
  await page.locator('.pl-accept').click();
  await expect(page.locator('#chat')).toHaveValue(/Act as a senior front-end engineer/);
  await page.close();
});

test('improve and accept work on a contenteditable editor via the heuristic', async () => {
  const page = await context.newPage();
  await page.goto('http://localhost:4173/prosemirror.html');
  await page.click('#editor');
  await page.type('#editor', 'summarize it');
  await expect(page.locator('.pl-badge')).toBeVisible({ timeout: 5000 });
  await page.locator('.pl-badge').click();
  await expect(page.locator('.pl-card')).toBeVisible();
  await page.locator('.pl-improve-btn').click();
  await expect(page.locator('.pl-diff')).toBeVisible();
  await page.locator('.pl-accept').click();
  await expect(page.locator('#editor')).toContainText('Act as an experienced editor');
  await page.close();
});

test('panel has Improve/Refine/Breakdown tabs and a refine instruction box', async () => {
  const page = await context.newPage();
  await page.goto('http://localhost:4173/textarea.html');
  await typePrompt(page, '#chat', 'make website');
  await expect(page.locator('.pl-badge')).toBeVisible({ timeout: 5000 });
  await page.locator('.pl-badge').click();
  await expect(page.locator('.pl-card')).toBeVisible();
  await expect(page.locator('.pl-tab')).toHaveCount(4); // Improve/Refine/Breakdown/Library
  await page.locator('.pl-tab', { hasText: 'Refine' }).click();
  await expect(page.locator('.pl-refine-input')).toBeVisible();
  await page.close();
});

test('pasted prompts score immediately (no typing debounce)', async () => {
  const page = await context.newPage();
  await page.goto('http://localhost:4173/textarea.html');
  await page.click('#chat');
  await page.evaluate(() => {
    const ta = document.getElementById('chat') as HTMLTextAreaElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
    setter.call(ta, 'make website');
    ta.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste' }));
  });
  await expect(page.locator('.pl-score')).toBeVisible({ timeout: 1500 });
  await page.close();
});

test('tracks programmatic rewrites and deletion without input events', async () => {
  const page = await context.newPage();
  await page.goto('http://localhost:4173/textarea.html');
  await typePrompt(page, '#chat', 'make website');
  const scoreChip = page.locator('.pl-score');
  await expect(scoreChip).toBeVisible({ timeout: 5000 });
  const weak = Number(await scoreChip.textContent());

  // The host app rewrites the editor directly — no input event fires.
  await page.evaluate(() => {
    (document.getElementById('chat') as HTMLTextAreaElement).value =
      'Act as a senior software engineer. Build a landing page in React with TypeScript. Output format: a single code block. It must include at least 3 sections.';
  });
  await expect(async () => {
    expect(Number(await scoreChip.textContent())).toBeGreaterThan(weak);
  }).toPass({ timeout: 3000 });

  // The host app clears the editor (e.g. after send) — the score chip must
  // disappear (the toolbar itself stays, Pretty-Prompt style).
  await page.evaluate(() => {
    (document.getElementById('chat') as HTMLTextAreaElement).value = '';
  });
  await expect(page.locator('.pl-score')).toBeHidden({ timeout: 3000 });
  await page.close();
});

test('badge follows the editor when the page layout shifts', async () => {
  const page = await context.newPage();
  await page.goto('http://localhost:4173/textarea.html');
  await typePrompt(page, '#chat', 'make website');
  await expect(page.locator('.pl-badge')).toBeVisible({ timeout: 5000 });
  const before = await page.locator('.pl-badge-wrap').boundingBox();

  // The host app re-layouts (e.g. messages stream in above the composer) —
  // no scroll or resize event fires, but the editor moves.
  await page.evaluate(() => {
    const main = document.querySelector('main') as HTMLElement;
    main.style.flex = 'none';
    main.style.height = '120px';
  });
  await expect(async () => {
    const after = await page.locator('.pl-badge-wrap').boundingBox();
    expect(after!.y).not.toBe(before!.y);
  }).toPass({ timeout: 2000 });
  await page.close();
});

test('library: sign-in pill, public prompts, detail, and apply', async () => {
  const page = await context.newPage();
  await page.goto('http://localhost:4173/textarea.html');
  await page.click('#chat');
  await expect(page.locator('.pl-library-btn')).toBeVisible({ timeout: 5000 });
  await page.locator('.pl-library-btn').click();
  await expect(page.locator('.pl-card')).toBeVisible();
  await expect(page.locator('.pl-account')).toHaveText('Sign in');
  await expect(page.locator('.pl-empty-state')).toBeVisible(); // fresh personal library
  await page.locator('.pl-tab', { hasText: 'Public' }).click();
  await expect(page.locator('.pl-lib-row').first()).toBeVisible();
  await page.locator('.pl-lib-row', { hasText: 'New-Hire Onboarding Deck' }).click();
  await expect(page.locator('.pl-lib-text')).toBeVisible();
  await page.locator('.pl-accept').click();
  await expect(page.locator('#chat')).toHaveValue(/new-hire onboarding deck/i);
  await page.close();
});

test('library: save current prompt into the personal library', async () => {
  const page = await context.newPage();
  await page.goto('http://localhost:4173/textarea.html');
  await typePrompt(page, '#chat', 'my favorite research prompt about markets');
  await expect(page.locator('.pl-library-btn')).toBeVisible({ timeout: 5000 });
  await page.locator('.pl-library-btn').click();
  await page.locator('.pl-accept', { hasText: 'Save current prompt' }).click();
  await expect(
    page.locator('.pl-lib-row', { hasText: 'my favorite research prompt' }),
  ).toBeVisible();
  await page.close();
});

test('panel never clips past the viewport when the input is at the top', async () => {
  const page = await context.newPage();
  await page.goto('http://localhost:4173/topchat.html');
  await typePrompt(page, '#chat', 'make website');
  await expect(page.locator('.pl-badge')).toBeVisible({ timeout: 5000 });
  await page.locator('.pl-badge').click();
  const card = page.locator('.pl-card');
  await expect(card).toBeVisible();
  const box = await card.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
  expect(box!.x).toBeGreaterThanOrEqual(0);
  await page.close();
});

test('stays dormant on non-matched origins', async () => {
  const page = await context.newPage();
  // 127.0.0.1 is not in the e2e manifest matches (only localhost is)
  await page.goto('http://127.0.0.1:4173/textarea.html');
  await page.click('#chat');
  await page.type('#chat', 'make website');
  await page.waitForTimeout(1500);
  expect(await page.locator('promptly-root').count()).toBe(0);
  await page.close();
});
