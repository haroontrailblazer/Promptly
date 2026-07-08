import type { LibraryPrompt } from './types';

// Curated starter pack shown in the Public library. When the backend is
// connected these are superseded by promptly_public_prompts; offline or
// unconfigured, this bundle keeps the Public tab useful.
export const PUBLIC_PROMPTS: LibraryPrompt[] = [
  {
    id: 'pub-code-review',
    title: 'Thorough Code Review',
    category: 'Coding',
    createdAt: 0,
    text: 'Act as a senior software engineer. Review the following code for correctness bugs, edge cases, security issues, and readability. For each finding: cite the line, explain why it matters, and show the fix. End with a prioritized summary.\n\n{paste code}',
  },
  {
    id: 'pub-debug',
    title: 'Debug an Error Systematically',
    category: 'Coding',
    createdAt: 0,
    text: 'Act as a debugging expert. I am seeing this error: {error message}. The relevant code is: {paste code}. Form 3 hypotheses ranked by likelihood, explain how to test each one, and give the most probable fix with reasoning.',
  },
  {
    id: 'pub-onboarding-deck',
    title: 'New-Hire Onboarding Deck',
    category: 'Business',
    createdAt: 0,
    text: "Build a new-hire onboarding deck for {team}. Focus on how we actually work: tools, rituals, coding/review standards (if applicable), decision rights, a 'one-week survival kit,' and a 30/60/90 plan. Minimize history; maximize 'how to get unstuck.'",
  },
  {
    id: 'pub-email-reply',
    title: 'Professional Email Reply',
    category: 'Writing',
    createdAt: 0,
    text: 'Act as a professional communications writer. Write a reply to the email below. Tone: {formal/friendly}. Goal: {what the reply must achieve}. Keep it under 150 words, no filler.\n\nEmail:\n{paste email}',
  },
  {
    id: 'pub-blog-outline',
    title: 'SEO Blog Post Outline',
    category: 'Marketing',
    createdAt: 0,
    text: 'Act as an experienced content strategist. Create a detailed outline for a blog post about {topic} targeting {audience}. Include: a hook, H2/H3 structure, key points per section, the primary keyword {keyword} placed naturally, and a CTA. Target length {word count} words.',
  },
  {
    id: 'pub-summarize-doc',
    title: 'Summarize a Document',
    category: 'Research',
    createdAt: 0,
    text: 'Summarize the attached document for {audience}. Output format: 5 key takeaways as bullets, then a 3-sentence executive summary, then any numbers or dates worth remembering as a table. Do not add information that is not in the document.',
  },
  {
    id: 'pub-compare-options',
    title: 'Compare Options With a Decision',
    category: 'Research',
    createdAt: 0,
    text: 'Act as a meticulous analyst. Compare {option A} vs {option B} for {use case}. Build a table across cost, capability, risks, and lock-in. Cite sources for every claim. End with a clear recommendation and the single strongest reason.',
  },
  {
    id: 'pub-marketing-plan',
    title: '30-Day Marketing Plan',
    category: 'Marketing',
    createdAt: 0,
    text: 'Act as a growth marketer. Create a 30-day marketing plan for {product} targeting {audience} with a budget of {budget}. Structure: week-by-week actions, channels with expected effort/impact, 3 measurable KPIs, and the first experiment to run tomorrow.',
  },
  {
    id: 'pub-study-plan',
    title: 'Personalized Study Plan',
    category: 'Academic',
    createdAt: 0,
    text: 'Act as a learning coach. Build a {number of weeks}-week study plan to learn {topic} from {current level} to {target level}, with {hours} hours/week. Include weekly goals, the single best resource per week, practice exercises, and a self-test to verify each milestone.',
  },
  {
    id: 'pub-meeting-summary',
    title: 'Meeting Notes → Action Items',
    category: 'Business',
    createdAt: 0,
    text: 'Turn these raw meeting notes into: (1) a 5-line summary, (2) a table of action items with owner and due date, (3) open questions. Keep names exactly as written. Notes:\n\n{paste notes}',
  },
  {
    id: 'pub-landing-copy',
    title: 'Landing Page Copy',
    category: 'Marketing',
    createdAt: 0,
    text: 'Act as a conversion copywriter. Write landing page copy for {product}: a headline under 10 words, a subheadline, 3 benefit blocks (title + 2 lines each), social proof section placeholder, and a CTA. Tone: {tone}. Audience: {audience}.',
  },
  {
    id: 'pub-sql-query',
    title: 'Write an SQL Query',
    category: 'Coding',
    createdAt: 0,
    text: 'Act as a database engineer. Write a SQL query ({dialect}) that {what the query must return}. Schema:\n{paste table definitions}\n\nExplain the query line by line, note any index that would speed it up, and show expected output columns.',
  },
];
