import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: ({ browser }) => {
    const icons = {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      96: 'icon/96.png',
      128: 'icon/128.png',
    };

    return {
      name: 'TraceMark',
      short_name: 'TraceMark',
      description: 'Save the useful part of the web — and keep the source attached.',
      icons,
      action: {
        default_icon: icons,
      },
      permissions: ['activeTab', 'scripting', 'contextMenus', 'storage'],
      optional_host_permissions: ['http://127.0.0.1:11434/*'],
      commands: {
        'save-selection': {
          suggested_key: {
            default: 'Alt+Shift+S',
          },
          description: 'Save selected text to TraceMark',
        },
      },
      ...(browser === 'firefox'
        ? {
            browser_specific_settings: {
              gecko: {
                id: 'tracemark@mateoosoriodelhonte.github.io',
                strict_min_version: '142.0',
                data_collection_permissions: {
                  required: ['none'],
                  optional: ['websiteContent'],
                },
              },
            },
          }
        : {}),
    };
  },
});
