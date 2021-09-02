import HDKey from 'hdkey';
import ethUtil from 'ethereumjs-util';
import sigUtil from 'eth-sig-util';
import { ChromeLedgerBridge } from './chrome-usb/bridge';
import { FirefoxLedgerBridge } from './firefox-u2f/bridge';
import { isChrome } from '../utils/env';

const pathBase = 'm';
const hdPathString = `${pathBase}/44'/60'/0'`;

export class BSCLedgerBridge {
  private baseHdPath: string;
  page: number;
  perPage: number;
  hdk: typeof HDKey;
  bridge: ChromeLedgerBridge | FirefoxLedgerBridge;

  constructor() {
    this.baseHdPath = hdPathString;
    this.page = 0;
    this.perPage = 5;
    this.hdk = new HDKey();
    this.bridge = isChrome ? new ChromeLedgerBridge() : new FirefoxLedgerBridge();
  }

  isUnlocked() {
    return Boolean(this.hdk && this.hdk.publicKey);
  }

  private setBaseHdPath(hdPath: string) {
    // Reset HDKey if the path changes
    if (this.baseHdPath !== hdPath) {
      this.hdk = new HDKey();
    }
    this.baseHdPath = hdPath;
  }

  unlock(hdPath?: string) {
    if (this.isUnlocked() && !hdPath) {
      return Promise.resolve('already unlocked');
    }
    const path = hdPath ? this._toLedgerPath(hdPath) : this.baseHdPath;

    return this.bridge.unlock(path).then((payload) => {
      this.hdk.publicKey = Buffer.from(payload.publicKey, 'hex');
      this.hdk.chainCode = Buffer.from(payload.chainCode as string, 'hex');
      return payload.address;
    });
  }

  getFirstPage(baseHdPath: string) {
    this.page = 0;
    return this.__getPage(baseHdPath, 1);
  }

  getNextPage(baseHdPath: string) {
    return this.__getPage(baseHdPath, 1);
  }

  getPreviousPage(baseHdPath: string) {
    return this.__getPage(baseHdPath, -1);
  }

  signTransaction(tx: any, hdPath: string) {
    return this.unlock().then((_: any) => {
      tx.v = ethUtil.bufferToHex(tx.getChainId());
      tx.r = '0x00';
      tx.s = '0x00';

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

  async signMessage(message: string, hdPath: string) {
    return this.unlock(hdPath).then(async (address: any) => {
      const payload = await this.bridge.signPersonalMessage(
        hdPath,
        ethUtil.stripHexPrefix(message),
      );

      let v = (payload.v - 27).toString(16);
      if (v.length < 2) {
        v = `0${v}`;
      }
      const signature = `0x${payload.r}${payload.s}${v}`;
      const addressSignedWith = sigUtil.recoverPersonalSignature({ data: message, sig: signature });
      if (ethUtil.toChecksumAddress(addressSignedWith) !== ethUtil.toChecksumAddress(address)) {
        new Error('Ledger: The signature doesnt match the right address');
      }
      return signature;
    });
  }

  async getPublicKey(hdPath: string) {
    return await (await this.bridge.unlock(hdPath)).publicKey;
  }

  private _getPathForIndex(index: number) {
    // Check if the path is BIP 44 (Ledger Live)
    return this._isLedgerLiveHdPath() ? `m/44'/60'/${index}'/0/0` : `${this.baseHdPath}/${index}`;
  }

  private async __getPage(baseHdPath: string, increment: number) {
    this.page += increment;

    if (this.page <= 0) {
      this.page = 1;
    }
    const from = (this.page - 1) * this.perPage;
    const to = from + this.perPage;

    this.setBaseHdPath(baseHdPath);
    await this.unlock();
    let accounts;
    if (this._isLedgerLiveHdPath()) {
      accounts = await this._getAccountsBIP44(from, to);
    } else {
      accounts = this._getAccountsLegacy(from, to);
    }

    return accounts;
  }

  private async _getAccountsBIP44(from: number, to: number) {
    const accounts = [];

    for (let i = from; i < to; i++) {
      const path = this._getPathForIndex(i);
      const address = await this.unlock(path);
      accounts.push({
        address,
        balance: 0,
        index: i,
        hdPath: path,
      });
    }
    return accounts;
  }

  private async _getAccountsLegacy(from: number, to: number) {
    const accounts = [];

    for (let i = from; i < to; i++) {
      const path = this._getPathForIndex(i);
      const address = this._addressFromIndex(i);
      accounts.push({
        address,
        balance: 0,
        index: i,
        hdPath: path,
      });
    }
    return accounts;
  }

  private _addressFromIndex(index: number) {
    const dkey = this.hdk.derive(`${pathBase}/${index}`);
    const address = ethUtil.publicToAddress(dkey.publicKey, true).toString('hex');
    return ethUtil.toChecksumAddress(`0x${address}`);
  }

  private _isLedgerLiveHdPath() {
    return this.baseHdPath === `m/44'/60'/0'/0/0`;
  }

  private _toLedgerPath(path: string) {
    return path.toString().replace('m/', '');
  }
}
