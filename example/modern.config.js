/* eslint-disable */
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
      '@binance-chain/ledger-bridge': '../',
    },
    moduleScopes: ['../'],
  },
  output: {
    assetPrefix: '../../',
  },
});
