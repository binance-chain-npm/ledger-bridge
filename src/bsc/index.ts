import ChromeUsbBridge from './chrome-usb';
import FirefoxU2f from './firefox-u2f';

const isChrome = /chrome/iu.test(window.navigator.userAgent);

export type BSCLedgerBridge = FirefoxU2f | ChromeUsbBridge;
export const BSCLedgerBridge = isChrome ? ChromeUsbBridge : FirefoxU2f;
