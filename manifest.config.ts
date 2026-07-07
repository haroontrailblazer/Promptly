import { defineManifest } from '@crxjs/vite-plugin';
import { ALLOWED_MATCHES } from './src/adapters/hosts';

export default defineManifest((env) => ({
  manifest_version: 3,
  name: 'Promptly',
  version: '0.1.0',
  description: 'Grammarly for AI prompts — analyze and improve prompts before you send them.',
  icons: { 16: 'icons/16.png', 32: 'icons/32.png', 48: 'icons/48.png', 128: 'icons/128.png' },
  action: { default_popup: 'src/popup/index.html' },
  background: { service_worker: 'src/background/index.ts', type: 'module' },
  content_scripts: [
    {
      matches: env.mode === 'e2e' ? [...ALLOWED_MATCHES, 'http://localhost/*'] : ALLOWED_MATCHES,
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
  permissions: ['storage', 'activeTab'],
  optional_host_permissions: ['https://api.anthropic.com/*'],
  commands: {
    'toggle-card': {
      suggested_key: { default: 'Ctrl+Shift+P' },
      description: 'Toggle the Promptly card',
    },
  },
}));
