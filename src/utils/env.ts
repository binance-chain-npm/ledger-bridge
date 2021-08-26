export const isChrome = /chrome/iu.test(window.navigator.userAgent);

export const getBridgeOrigin = () => {
  // if (__DEV__) {
  //   return `https://localhost:5000/dist/gh`;
  // }

  return `https://binance-chain-npm.github.io/ledger-bridge`;
};
