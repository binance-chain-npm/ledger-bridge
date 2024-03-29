import { crypto, Transaction } from '@bnb-chain/javascript-sdk';
import { ChromeLedgerBridge } from './chrome-usb/bridge';
import { FirefoxLedgerBridge } from './firefox-u2f/bridge';
import { isChrome } from '../utils/env';
import { isHex } from '@bnb-chain/javascript-sdk/lib/utils';

export class BBCLedgerBridge {
  page: number;
  perPage: number;
  hrp: string;
  bridge: ChromeLedgerBridge | FirefoxLedgerBridge;

  constructor() {
    this.page = 0;
    this.perPage = 5;
    this.hrp = 'bnb';

    this.bridge = isChrome ? new ChromeLedgerBridge() : new FirefoxLedgerBridge();
  }

  setHrp(hrp: string) {
    this.hrp = hrp;
  }

  async unlock(hdPath: string) {
    return await (await this.bridge.unlock(this._toPathArray(hdPath), this.hrp)).address;
  }

  signTransaction(tx: Transaction, hdPath: string): Promise<Transaction> {
    const signBytes = tx.getSignBytes();

    return this.bridge
      .signTransaction(this._toPathArray(hdPath), signBytes.toString('hex'), this.hrp)
      .then((payload: any) => {
        const pubKey = crypto.getPublicKey(payload.pubKey);
        tx.addSignature(pubKey, Buffer.from(payload.signature, 'hex'));
        return tx;
      })
      .catch((e) => {
        return Promise.reject(
          new Error(e.message || 'Ledger: Unknown error while signing transaction'),
        );
      });
  }

  async signMessage(message: string, hdPath: string): Promise<string> {
    // throw new Error('signMessage: Not support');
    const _message = isHex(message) ? message : Buffer.from(message).toString('hex');
    return this.bridge
      .signTransaction(this._toPathArray(hdPath), _message, this.hrp)
      .then((payload) => `0x${payload.signature}`);
  }

  async getPublicKey(hdPath: string) {
    return await (await this.bridge.unlock(this._toPathArray(hdPath), this.hrp)).publicKey;
  }

  getFirstPage(hdPath: string) {
    this.page = 0;
    return this.__getPage(hdPath, 1);
  }

  getNextPage(hdPath: string) {
    return this.__getPage(hdPath, 1);
  }

  getPreviousPage(hdPath: string) {
    return this.__getPage(hdPath, -1);
  }

  private _toPathArray(hdPath: string) {
    return hdPath.split('/').map((i) => Number(i));
  }

  async __getPage(hdPath: string, increment: number) {
    this.page += increment;

    if (this.page <= 0) {
      this.page = 1;
    }

    const from = (this.page - 1) * this.perPage;
    const path = this._toPathArray(hdPath);
    const accounts = [];
    for (let i = 0; i < this.perPage; i++) {
      path.splice(path.length - 1, 1, from + i);

      const account = await this.bridge.unlock(path, this.hrp);
      accounts.push({
        address: account.address,
        hdPath: path.join('/'),
        balance: 0,
        index: from + i,
      });
    }

    return accounts;
  }
}
