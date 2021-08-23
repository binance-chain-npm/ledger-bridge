import { ledger as Ledger, crypto } from '@binance-chain/javascript-sdk';
import LedgerApp from '@binance-chain/javascript-sdk/lib/ledger/ledger-app';
import {
  DEFAULT_GET_ADDRESSES_LIMIT,
  DEFAULT_LEDGER_INTERACTIVE_TIMEOUT,
  DEFAULT_LEDGER_NONINTERACTIVE_TIMEOUT,
} from '../../constants';

export class BcLedgerBridge {
  private app: LedgerApp | null;
  private transport: any;

  constructor() {
    this.addEventListeners();
    this.app = null;
    this.transport = null;
  }

  addEventListeners() {
    window.addEventListener(
      'message',
      async (e) => {
        if (e && e.data && e.data.target === 'BC-LEDGER-IFRAME') {
          const { action, params } = e.data;
          const replyAction = `${action}-reply`;
          switch (action) {
            case 'ledger-unlock':
              this.unlock(replyAction, params.hdPath, params.hrp);
              break;
            case 'ledger-sign-transaction':
              this.signTransaction(replyAction, params.hdPath, params.tx, params.hrp);
              break;
          }
        }
      },
      false,
    );
  }

  sendMessageToExtension(msg: any) {
    window.parent.postMessage(msg, '*');
  }

  async makeApp() {
    try {
      let transImpl = Ledger.transports['u2f'];
      const transInst = await transImpl.create(30000);
      this.transport = transInst;
      this.app = new Ledger.app(
        transInst,
        DEFAULT_LEDGER_INTERACTIVE_TIMEOUT,
        DEFAULT_LEDGER_NONINTERACTIVE_TIMEOUT,
      );
    } catch (e) {
      console.log('LEDGER:::CREATE APP ERROR', e);
    }
  }

  cleanUp() {
    this.app = null;
    this.transport.close();
  }

  async unlock(replyAction: any, hdPath: string, hrp: string) {
    try {
      console.log('start make ledger app');
      await this.makeApp();
      const res = await this.getAddresses({
        hdPathStart: hdPath.split(',').map((item) => Number(item)),
        hrp,
      });
      this.sendMessageToExtension({
        action: replyAction,
        success: true,
        payload: res,
      });
    } catch (err) {
      console.log('error');
      console.log(err);
      const e = this.ledgerErrToMessage(err);

      this.sendMessageToExtension({
        action: replyAction,
        success: false,
        payload: { error: e.toString() },
      });
    } finally {
      this.cleanUp();
    }
  }

  async signTransaction(replyAction: string, hdPath: string, tx: any, hrp: string = 'bnb') {
    try {
      await this.makeApp();
      const path = hdPath.split(',').map((item) => Number(item));
      await this.mustHaveApp().showAddress(hrp, path);
      const pubKeyResp = await this.mustHaveApp().getPublicKey(path);
      const pubKey = crypto.getPublicKey(pubKeyResp!.pk!.toString('hex'));
      const res = await this.mustHaveApp().sign(Buffer.from(tx, 'hex'), path);
      console.log(res);
      this.sendMessageToExtension({
        action: replyAction,
        success: true,
        payload: {
          signature: res?.signature?.toString('hex'),
          pubkey: pubKey.encode('hex', true),
        },
      });
    } catch (err) {
      console.log(err);
      const e = this.ledgerErrToMessage(err);
      this.sendMessageToExtension({
        action: replyAction,
        success: false,
        payload: { error: e.toString() },
      });
    } finally {
      this.cleanUp();
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

    if (errMsg.includes('6804')) {
      return 'LEDGER_LOCKED';
    }

    if (errMsg.includes('6986')) {
      return 'Transaction rejected';
    }

    return errMsg.toString();
  }
}
