import { ChromeUsbBridge } from './chrome-usb';
import { FirefoxU2fBridge } from './firefox-u2f';

const isChrome = /chrome/i.test(navigator.userAgent);

export type BBCLedgerBridge = ChromeUsbBridge | FirefoxU2fBridge;
export const BBCLedgerBridge = isChrome ? ChromeUsbBridge : FirefoxU2fBridge;
