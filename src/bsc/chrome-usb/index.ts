import HDKey from 'hdkey';
import ethUtil from 'ethereumjs-util';
import { LedgerBridge } from './bridge';

const pathBase = 'm';
const hdPathString = `${pathBase}/44'/60'/0'`;

const MAX_INDEX = 1000;

class ChromeUsbBridge {
  page: number;
  perPage: number;
  hdk: typeof HDKey;
  paths: { [k: string]: number };
  hdPath: string;
  bridge: LedgerBridge;

  constructor() {
    this.page = 0;
    this.perPage = 5;
    this.hdk = new HDKey();
    this.paths = {};
    this.hdPath = hdPathString;
    this.bridge = new LedgerBridge();
  }

  isUnlocked() {
    return Boolean(this.hdk && this.hdk.publicKey);
  }

  setHdPath(hdPath: string) {
    // Reset HDKey if the path changes
    if (this.hdPath !== hdPath) {
      this.hdk = new HDKey();
    }
    this.hdPath = hdPath;
  }

  unlock(hdPath?: string) {
    if (this.isUnlocked() && !hdPath) {
      return Promise.resolve('already unlocked');
    }
    const path = hdPath ? this._toLedgerPath(hdPath) : this.hdPath;

    return this.bridge.unlock(path).then((payload) => {
      this.hdk.publicKey = Buffer.from(payload.publicKey, 'hex');
      this.hdk.chainCode = Buffer.from(payload.chainCode as string, 'hex');
      return payload.address;
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

  signTransaction(address: string, tx: any, accountIndex: number) {
    return this.unlock().then((_: any) => {
      tx.v = ethUtil.bufferToHex(tx.getChainId());
      tx.r = '0x00';
      tx.s = '0x00';

      let hdPath;
      if (this._isLedgerLiveHdPath()) {
        const index = accountIndex;
        hdPath = this._getPathForIndex(index);
      } else {
        hdPath = this._toLedgerPath(this._pathFromAddress(address));
      }

      return this.bridge
        .signTransaction(
          hdPath,
          tx.serialize().toString('hex'),
          ethUtil.bufferToHex(tx.to).toLowerCase(),
        )
        .then((payload) => {
          tx.v = Buffer.from(payload.v, 'hex');
          tx.r = Buffer.from(payload.r, 'hex');
          tx.s = Buffer.from(payload.s, 'hex');
          return tx;
        });
    });
  }

  async __getPage(increment: number) {
    this.page += increment;

    if (this.page <= 0) {
      this.page = 1;
    }
    const from = (this.page - 1) * this.perPage;
    const to = from + this.perPage;

    await this.unlock();
    let accounts;
    if (this._isLedgerLiveHdPath()) {
      accounts = await this._getAccountsBIP44(from, to);
    } else {
      accounts = this._getAccountsLegacy(from, to);
    }

    return accounts;
  }

  async _getAccountsBIP44(from: number, to: number) {
    const accounts = [];

    for (let i = from; i < to; i++) {
      const path = this._getPathForIndex(i);
      const address = await this.unlock(path);
      accounts.push({
        address,
        balance: 0,
        index: i,
      });
    }
    return accounts;
  }

  _getAccountsLegacy(from: number, to: number) {
    const accounts = [];

    for (let i = from; i < to; i++) {
      const address = this._addressFromIndex(pathBase, i);
      accounts.push({
        address,
        balance: 0,
        index: i,
      });
      this.paths[ethUtil.toChecksumAddress(address)] = i;
    }
    return accounts;
  }

  _addressFromIndex(pathBase: string, i: number) {
    const dkey = this.hdk.derive(`${pathBase}/${i}`);
    const address = ethUtil.publicToAddress(dkey.publicKey, true).toString('hex');
    return ethUtil.toChecksumAddress(`0x${address}`);
  }

  _pathFromAddress(address: string) {
    const checksummedAddress = ethUtil.toChecksumAddress(address);
    let index = this.paths[checksummedAddress];
    if (typeof index === 'undefined') {
      for (let i = 0; i < MAX_INDEX; i++) {
        if (checksummedAddress === this._addressFromIndex(pathBase, i)) {
          index = i;
          break;
        }
      }
    }

    if (typeof index === 'undefined') {
      throw new Error('Unknown address');
    }
    return this._getPathForIndex(index);
  }

  _getPathForIndex(index: number) {
    // Check if the path is BIP 44 (Ledger Live)
    return this._isLedgerLiveHdPath() ? `m/44'/60'/${index}'/0/0` : `${this.hdPath}/${index}`;
  }

  _isLedgerLiveHdPath() {
    return this.hdPath === `m/44'/60'/0'/0/0`;
  }

  _toLedgerPath(path: string) {
    return path.toString().replace('m/', '');
  }
}

export default ChromeUsbBridge;
