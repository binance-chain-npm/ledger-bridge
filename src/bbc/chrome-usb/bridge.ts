import { ledger as Ledger, crypto } from '@binance-chain/javascript-sdk';
import LedgerApp from '@binance-chain/javascript-sdk/lib/ledger/ledger-app';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import {
  DEFAULT_GET_ADDRESSES_LIMIT,
  DEFAULT_LEDGER_INTERACTIVE_TIMEOUT,
  DEFAULT_LEDGER_NONINTERACTIVE_TIMEOUT,
} from '../constants';

export class LedgerBridge {
  private app: LedgerApp | null;
  private transport: any;

  constructor() {
    this.app = null;
    this.transport = null;
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
      throw new Error(this.ledgerErrToMessage(e));
    }
  }

  async cleanUp() {
    this.app = null;
    await this.transport.close();
  }

  async unlock(hdPath: string, hrp: string) {
    try {
      console.log('start make ledger app');
      await this.makeApp();
      const res = await this.getAddresses({
        hdPathStart: hdPath.split(',').map((item) => Number(item)),
        hrp,
      });
      return res;
    } catch (err) {
      console.error(err);
      return Promise.reject(this.ledgerErrToMessage(err));
    } finally {
      await this.cleanUp();
    }
  }

  async signTransaction(hdPath: string, tx: any, hrp: string = 'bnb') {
    try {
      await this.makeApp();
      const path = hdPath.split(',').map((item) => Number(item));
      await this.mustHaveApp().showAddress(hrp, path);
      const pubKeyResp = await this.mustHaveApp().getPublicKey(path);
      const pubKey = crypto.getPublicKey(pubKeyResp!.pk!.toString('hex'));
      const res = await this.mustHaveApp().sign(Buffer.from(tx, 'hex'), path);
      console.log(res);

      return {
        signature: res?.signature?.toString('hex'),
        pubkey: pubKey.encode('hex', true),
      };
    } catch (err) {
      console.log(err);
      return Promise.reject(this.ledgerErrToMessage(err));
    } finally {
      await this.cleanUp();
    }
  }

  mustHaveApp() {
    if (this.app === null) {
      throw new Error('LedgerClient: Call makeApp() first');
    }
    return this.app;
  }

  async getPublicKey(hdPath: number[]) {
    return this.mustHaveApp().getPublicKey(hdPath);
  }

  async getAddresses({
    hdPathStart,
    hrp = 'bnb',
    limit = DEFAULT_GET_ADDRESSES_LIMIT,
  }: {
    hdPathStart: Array<number>;
    hrp?: string;
    limit?: number;
  }) {
    if (!Array.isArray(hdPathStart) || hdPathStart.length < 5) {
      throw new Error('hdPathStart must be an array containing at least 5 path nodes');
    }

    const addresses = [];
    let hdPath = hdPathStart;
    for (let i = 0; i < limit; i++) {
      if (Number(hdPath[hdPath.length - 1]) > 0x7fffffff) break;

      const response = await this.getPublicKey(hdPath);
      const { pk } = response;
      const address = crypto.getAddressFromPublicKey((pk as Buffer).toString('hex'), hrp);
      addresses.push(address);

      hdPath = hdPathStart.slice();
      hdPath[hdPath.length - 1] = i + hdPath[hdPath.length - 1] + 1;
    }
    return addresses;
  }

  ledgerErrToMessage(err: any) {
    const errMsg = err.message;
    const isRequireGesture = (e: Error) => e.name === 'TransportWebUSBGestureRequired';

    if (isRequireGesture(err)) {
      return 'LEDGER_NEED_USB_PERMISSION';
    }

    if (errMsg.includes('6804')) {
      return 'LEDGER_LOCKED';
    }

    if (errMsg.includes('6986')) {
      return 'Transaction rejected';
    }

    return errMsg.toString();
  }
}
