/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable node/no-unsupported-features/es-syntax */
import { defineConfig } from '@modern-js/app-tools';

export default defineConfig({
  runtime: {
    state: false,
    router: {
      supportHtml5History: false,
    },
  },
  source: {
    alias: {
      '@bnb-chain/ledger-bridge': '../',
    },
    moduleScopes: ['../'],
  },
  output: {
    assetPrefix: '../../',
  },
});
