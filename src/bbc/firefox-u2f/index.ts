import { crypto, Transaction } from '@binance-chain/javascript-sdk';

const DEFAULT_HD_PATH = [44, 714, 0, 0, 0];
const BRIDGE_URL = 'https://binance-chain-npm.github.io/bc-ledger-bridge';

class FirefoxU2fBridge {
  hdPath: Array<number>;
  page: number;
  perPage: number;
  iframe: any;
  bridgeUrl: string;
  hrp: string;

  constructor() {
    this.page = 0;
    this.perPage = 5;
    this.iframe = null;
    this.hdPath = DEFAULT_HD_PATH;
    this.bridgeUrl = BRIDGE_URL;
    this.hrp = 'bnb';

    this._setupIframe();
  }

  setHdPath(hdPath: Array<number>) {
    this.hdPath = hdPath;
  }

  setHrp(hrp: string) {
    this.hrp = hrp;
  }

  unlock(): Promise<Array<string>> {
    return new Promise((resolve, reject) => {
      this._sendMessage(
        {
          action: 'ledger-unlock',
          params: {
            hdPath: this.hdPath.toString(),
            hrp: this.hrp,
          },
        },
        function({ success, payload }: { success: boolean; payload: any }) {
          if (success) {
            resolve(payload);
          } else {
            reject(payload.error || 'Unknown error');
          }
        },
      );
    });
  }

  signTransaction(tx: Transaction, hdPath: Array<number>): Promise<Transaction> {
    return new Promise((resolve, reject) => {
      const signBytes = tx.getSignBytes();

      this._sendMessage(
        {
          action: 'ledger-sign-transaction',
          params: {
            tx: signBytes.toString('hex'),
            hdPath: hdPath.toString(),
            hrp: this.hrp,
          },
        },
        ({ success, payload }: any) => {
          if (success) {
            var pubKey = crypto.getPublicKey(payload.pubkey);
            tx.addSignature(pubKey, Buffer.from(payload.signature, 'hex'));
            resolve(tx);
          } else {
            reject(new Error(payload.error || 'Ledger: Unknown error while signing transaction'));
          }
        },
      );
    });
  }

  getFirstPage() {
    this.page = 0;
    return this.__getPage(1);
  }

  getNextPage() {
    return this.__getPage(1);
  }

  getPreviousPage() {
    return this.__getPage(-1);
  }

  async __getPage(increment: number) {
    this.page += increment;

    if (this.page <= 0) {
      this.page = 1;
    }
    const from = (this.page - 1) * this.perPage;
    this.hdPath.splice(this.hdPath.length - 1, 1, from);

    const accounts = (await this.unlock()) || [];
    return accounts.map((address, index) => {
      return {
        address: address,
        index: index,
        balance: 0,
      };
    });
  }

  _setupIframe() {
    this.iframe = document.createElement('iframe');
    this.iframe.src = this.bridgeUrl;
    document.head.appendChild(this.iframe);
  }

  _getOrigin() {
    var tmp = this.bridgeUrl.split('/');
    tmp.splice(-1, 1);
    return tmp.join('/');
  }

  _sendMessage(msg: any, cb: any) {
    msg.target = 'BC-LEDGER-IFRAME';
    this.iframe.contentWindow.postMessage(msg, '*');

    const eventListener = ({ origin, data }: any) => {
      if (origin !== this._getOrigin()) {
        return false;
      }

      if (data && data.action && data.action === msg.action + '-reply') {
        cb(data);
        return undefined;
      }

      window.removeEventListener('message', eventListener);
      return undefined;
    };

    window.addEventListener('message', eventListener);
  }
}

export { FirefoxU2fBridge };
