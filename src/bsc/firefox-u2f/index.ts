import HDKey from 'hdkey';
import ethUtil from 'ethereumjs-util';
import sigUtil from 'eth-sig-util';
import { getBridgeOrigin } from '../../utils/env';

const pathBase = 'm';
const hdPathString = `${pathBase}/44'/60'/0'`;
const type = 'Ledger Hardware';

const BRIDGE_URL = `${getBridgeOrigin()}/bsc/`;

const MAX_INDEX = 1000;
const NETWORK_API_URLS = {
  ropsten: 'http://api-ropsten.etherscan.io',
  kovan: 'http://api-kovan.etherscan.io',
  rinkeby: 'https://api-rinkeby.etherscan.io',
  mainnet: 'https://api.etherscan.io',
};

class FirefoxU2f {
  static type: string;
  bridgeUrl: string;
  page: number;
  perPage: number;
  hdk: typeof HDKey;
  paths: { [k: string]: any };
  iframe: HTMLIFrameElement;
  network: keyof typeof NETWORK_API_URLS;
  hdPath: string;

  constructor() {
    this.bridgeUrl = BRIDGE_URL;
    this.page = 0;
    this.perPage = 5;
    this.hdk = new HDKey();
    this.paths = {};
    this.iframe = {} as HTMLIFrameElement;
    this.hdPath = hdPathString;
    this.network = 'mainnet';
    this._setupIframe();
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

  async getPublicKey(address: string, accountIndex: number) {
    const hdPath = this._getExactHdPath(address, accountIndex);
    return new Promise((resolve, reject) => {
      this._sendMessage(
        {
          action: 'ledger-unlock',
          params: {
            hdPath,
          },
        },
        ({ success, payload }: { success: boolean; payload: any }) => {
          if (success) {
            resolve(payload.publicKey);
          } else {
            reject(payload.error || 'Unknown error');
          }
        },
      );
    });
  }

  unlock(hdPath?: string): Promise<string> {
    if (this.isUnlocked() && !hdPath) {
      return Promise.resolve('already unlocked');
    }
    const path = hdPath ? this._toLedgerPath(hdPath) : this.hdPath;
    return new Promise((resolve, reject) => {
      this._sendMessage(
        {
          action: 'ledger-unlock',
          params: {
            hdPath: path,
          },
        },
        ({ success, payload }: { success: boolean; payload: any }) => {
          if (success) {
            this.hdk.publicKey = Buffer.from(payload.publicKey, 'hex');
            this.hdk.chainCode = Buffer.from(payload.chainCode, 'hex');
            resolve(payload.address);
          } else {
            reject(payload.error || 'Unknown error');
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

  updateTransportMethod() {
    console.log('Only for compatible');
  }

  signTransaction(address: string, tx: any, accountIndex: number) {
    return new Promise((resolve, reject) => {
      this.unlock()
        .then((_) => {
          tx.v = ethUtil.bufferToHex(tx.getChainId());
          tx.r = '0x00';
          tx.s = '0x00';

          const hdPath = this._getExactHdPath(address, accountIndex);
          this._sendMessage(
            {
              action: 'ledger-sign-transaction',
              params: {
                tx: tx.serialize().toString('hex'),
                hdPath,
                to: ethUtil.bufferToHex(tx.to).toLowerCase(),
              },
            },
            ({ success, payload }: { success: boolean; payload: any }) => {
              if (success) {
                tx.v = Buffer.from(payload.v, 'hex');
                tx.r = Buffer.from(payload.r, 'hex');
                tx.s = Buffer.from(payload.s, 'hex');

                resolve(tx);
              } else {
                reject(
                  new Error(payload.error || 'Ledger: Unknown error while signing transaction'),
                );
              }
            },
          );
        })
        .catch((err) => {
          throw err;
        });
    });
  }

  async signMessage(address: string, message: string, accountIndex: number): Promise<string> {
    return new Promise((resolve, reject) => {
      this.unlock()
        .then(async (_: any) => {
          const hdPath = this._getExactHdPath(address, accountIndex);

          return this._sendMessage(
            {
              action: 'ledger-sign-personal-message',
              params: {
                hdPath,
                message: ethUtil.stripHexPrefix(message),
              },
            },
            ({ success, payload }: { success: boolean; payload: any }) => {
              if (success) {
                let v = (payload.v - 27).toString(16);
                if (v.length < 2) {
                  v = `0${v}`;
                }
                const signature = `0x${payload.r}${payload.s}${v}`;
                const addressSignedWith = sigUtil.recoverPersonalSignature({
                  data: message,
                  sig: signature,
                });
                if (
                  ethUtil.toChecksumAddress(addressSignedWith) !==
                  ethUtil.toChecksumAddress(address)
                ) {
                  reject(new Error('Ledger: The signature doesnt match the right address'));
                }
                resolve(signature);
              } else {
                reject(new Error(payload.error || 'Ledger: Unknown error while signing message'));
              }
            },
          );
        })
        .catch((err) => {
          throw err;
        });
    });
  }

  /* PRIVATE METHODS */

  _getExactHdPath(address: string, accountIndex: number) {
    let hdPath;
    if (this._isLedgerLiveHdPath()) {
      const index = accountIndex;
      hdPath = this._getPathForIndex(index);
    } else {
      hdPath = this._toLedgerPath(this._pathFromAddress(address));
    }

    return hdPath;
  }

  _setupIframe() {
    this.iframe = document.createElement('iframe');
    this.iframe.src = this.bridgeUrl;
    document.head.appendChild(this.iframe);
  }

  _getOrigin() {
    return this.bridgeUrl
      .split('/')
      .slice(0, 3)
      .join('/');
  }

  _sendMessage(msg: any, cb: Function) {
    msg.target = 'LEDGER-IFRAME';
    this.iframe.contentWindow?.postMessage(msg, '*');
    const eventListener = ({ origin, data }: any) => {
      if (origin !== this._getOrigin()) {
        return false;
      }

      if (data && data.action && data.action === `${msg.action}-reply` && cb) {
        cb(data);
        return undefined;
      }

      window.removeEventListener('message', eventListener);
      return undefined;
    };
    window.addEventListener('message', eventListener);
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

  // eslint-disable-next-line no-shadow
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

  _toAscii(hex: string) {
    let str = '';
    let i = 0;
    const l = hex.length;
    if (hex.substring(0, 2) === '0x') {
      i = 2;
    }
    for (; i < l; i += 2) {
      const code = parseInt(hex.substr(i, 2), 16);
      str += String.fromCharCode(code);
    }

    return str;
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

  async _hasPreviousTransactions(address: string) {
    const apiUrl = this._getApiUrl();
    const response = await window.fetch(
      `${apiUrl}/api?module=account&action=txlist&address=${address}&tag=latest&page=1&offset=1`,
    );
    const parsedResponse = await response.json();
    if (parsedResponse.status !== '0' && parsedResponse.result.length > 0) {
      return true;
    }
    return false;
  }

  _getApiUrl() {
    return NETWORK_API_URLS[this.network] || NETWORK_API_URLS.mainnet;
  }
}

FirefoxU2f.type = type;
export default FirefoxU2f;
