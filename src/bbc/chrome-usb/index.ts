import { crypto, Transaction } from '@binance-chain/javascript-sdk';
import { LedgerBridge } from './bridge';

const DEFAULT_HD_PATH = [44, 714, 0, 0, 0];

class ChromeUsbBridge {
  hdPath: Array<number>;
  page: number;
  perPage: number;
  hrp: string;
  bridge: LedgerBridge;

  constructor() {
    this.page = 0;
    this.perPage = 5;
    this.hdPath = DEFAULT_HD_PATH;
    this.hrp = 'bnb';

    this.bridge = new LedgerBridge();
  }

  setHdPath(hdPath: Array<number>) {
    this.hdPath = hdPath;
  }

  setHrp(hrp: string) {
    this.hrp = hrp;
  }

  unlock(): Promise<Array<string>> {
    return this.bridge.unlock(this.hdPath, this.hrp);
  }

  signTransaction(tx: Transaction, hdPath: Array<number>): Promise<Transaction> {
    const signBytes = tx.getSignBytes();

    return this.bridge
      .signTransaction(hdPath, signBytes.toString('hex'), this.hrp)
      .then((payload: any) => {
        const pubKey = crypto.getPublicKey(payload.pubkey);
        tx.addSignature(pubKey, Buffer.from(payload.signature, 'hex'));
        return tx;
      })
      .catch((e) => {
        return Promise.reject(
          new Error(e.message || 'Ledger: Unknown error while signing transaction'),
        );
      });
  }

  async signMessage(hdPath: number[], message: string) {
    console.warn(hdPath, message);
    throw new Error('signMessage: Not support');
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
        balance: 0,
        index: index,
      };
    });
  }
}

export { ChromeUsbBridge };
