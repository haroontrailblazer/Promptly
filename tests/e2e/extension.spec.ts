import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test';
import path from 'node:path';

let context: BrowserContext;

test.beforeAll(async () => {
  const dist = path.resolve('dist-e2e');
  context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
  });
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
  await expect(page.locator('.pl-badge')).toHaveText('P');
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
