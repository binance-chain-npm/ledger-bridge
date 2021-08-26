import { getBridgeOrigin } from '../../utils/env';

const BRIDGE_URL = `${getBridgeOrigin()}/bbc/`;

export class FirefoxLedgerBridge {
  iframe: any;
  bridgeUrl: string;

  constructor() {
    this.bridgeUrl = BRIDGE_URL;

    this.iframe = null;
    this._setupIframe();
  }

  async unlock(hdPath: number[], hrp: string): Promise<{ address: string; publicKey: string }> {
    return this._sendMessage({
      action: 'ledger-unlock',
      params: {
        hdPath: hdPath.toString(),
        hrp,
      },
    });
  }

  signTransaction(hdPath: number[], tx: any, hrp: string = 'bnb') {
    return this._sendMessage({
      action: 'ledger-sign-transaction',
      params: {
        tx,
        hdPath: hdPath.toString(),
        hrp,
      },
    });
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

  _sendMessage(msg: { action: string; params: any }): Promise<any> {
    this.iframe.contentWindow?.postMessage(
      {
        ...msg,
        target: 'BC-LEDGER-IFRAME',
      },
      '*',
    );

    return new Promise((resolve, reject) => {
      const eventListener = ({ origin, data }: any) => {
        if (origin !== this._getOrigin()) {
          reject('OriginError');
          return;
        }

        if (data && data.action && data.action === `${msg.action}-reply`) {
          if (!data.success) {
            return reject(data.payload.error);
          }

          resolve(data.payload);
          return;
        }

        window.removeEventListener('message', eventListener);
        return;
      };
      window.addEventListener('message', eventListener);
    });
  }
}
