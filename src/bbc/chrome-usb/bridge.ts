import { ledger as Ledger, crypto } from '@binance-chain/javascript-sdk';
import LedgerApp from '@binance-chain/javascript-sdk/lib/ledger/ledger-app';
import Transport from '@ledgerhq/hw-transport';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import {
  DEFAULT_LEDGER_INTERACTIVE_TIMEOUT,
  DEFAULT_LEDGER_NONINTERACTIVE_TIMEOUT,
} from '../constants';

export class ChromeLedgerBridge {
  private app: LedgerApp;
  private transport: Transport;

  constructor() {
    this.app = {} as LedgerApp;
    this.transport = {} as Transport;
  }

  async makeApp() {
    try {
      const transInst = await TransportWebUSB.create(30000);
      this.transport = transInst;
      this.app = new Ledger.app(
        transInst,
        DEFAULT_LEDGER_INTERACTIVE_TIMEOUT,
        DEFAULT_LEDGER_NONINTERACTIVE_TIMEOUT,
      );
    } catch (e) {
      console.error('LEDGER:::CREATE APP ERROR', e);
      throw e;
    }
  }

  async cleanUp() {
    this.app = {} as LedgerApp;
    try {
      this.transport?.close && (await this.transport.close());
    } catch (e) {
      // ignore error.
      console.warn(e);
    }
  }

  async unlock(hdPath: number[], hrp: string) {
    try {
      await this.makeApp();
      return {
        address: await this.getAddressByHdPath(hdPath, hrp),
        publicKey: await this.getPublicKey(hdPath),
      };
    } catch (err) {
      throw new Error(this.ledgerErrToMessage(err));
    } finally {
      await this.cleanUp();
    }
  }

  async signTransaction(hdPath: number[], tx: any, hrp: string = 'bnb') {
    try {
      await this.makeApp();
      await this.mustHaveApp().showAddress(hrp, hdPath);
      const pubKeyResp = await this.mustHaveApp().getPublicKey(hdPath);
      const pubKey = crypto.getPublicKey(pubKeyResp!.pk!.toString('hex'));
      const res = await this.mustHaveApp().sign(Buffer.from(tx, 'hex'), hdPath);

      return {
        signature: res?.signature?.toString('hex'),
        pubKey: pubKey.encode('hex', true),
      };
    } catch (err) {
      throw new Error(this.ledgerErrToMessage(err));
    } finally {
      await this.cleanUp();
    }
  }

  mustHaveApp() {
    if (this.app.getVersion === undefined) {
      throw new Error('LedgerClient: Call makeApp() first');
    }
    return this.app;
  }

  async getPublicKey(hdPath: number[]) {
    const pubKeyResp = await this.mustHaveApp().getPublicKey(hdPath);
    const pubKey = crypto.getPublicKey(pubKeyResp!.pk!.toString('hex'));
    return pubKey.encode('hex', true);
  }

  async getAddressByHdPath(hdPath: number[], hrp: string) {
    return crypto.getAddressFromPublicKey(await this.getPublicKey(hdPath), hrp);
  }

  ledgerErrToMessage(err: any) {
    const isStringError = (e: any) => typeof e === 'string';
    const isErrorWithId = (e: any) => e.hasOwnProperty('id') && e.hasOwnProperty('message');
    const isWrongAppError = (e: any) => {
      const m = String(e.message || e);
      return m.includes('0x6700') || m.includes('0x6e00');
    };
    const isLedgerLockedError = (e: any) => {
      const m = String(e.message || e);
      return m.includes('OpenFailed') || m.includes('0x6804');
    };
    const isRequireGesture = (e: any) => {
      const m = String(e.name || e);
      return m === 'TransportWebUSBGestureRequired' || m === 'TransportOpenUserCancelled';
    };

    if (__DEV__) console.error('error: ', err);
    if (isRequireGesture(err)) {
      return 'LEDGER_NEED_USB_PERMISSION';
    }

    if (isWrongAppError(err)) {
      return 'LEDGER_WRONG_APP';
    }

    if (isLedgerLockedError(err) || (isStringError(err) && err.includes('6801'))) {
      return 'LEDGER_LOCKED';
    }

    if (isErrorWithId(err)) {
      // Browser doesn't support U2F
      if (err.message.includes('U2F not supported')) {
        return 'U2F_NOT_SUPPORTED';
      }
    }

    // Other
    return err.toString();
  }
}
