import { getBridgeOrigin } from '../../utils/env';

const BRIDGE_URL = `${getBridgeOrigin()}/bsc/`;

export class FirefoxLedgerBridge {
  bridgeUrl: string;
  iframe: HTMLIFrameElement;

  constructor() {
    this.bridgeUrl = BRIDGE_URL;
    this.iframe = {} as HTMLIFrameElement;
    this._setupIframe();
  }

  async getPublicKey(hdPath: string): Promise<string> {
    return this._sendMessage({
      action: 'ledger-unlock',
      params: {
        hdPath,
      },
    });
  }

  unlock(
    hdPath: string,
  ): Promise<{
    publicKey: string;
    address: string;
    chainCode?: string | undefined;
  }> {
    return this._sendMessage({
      action: 'ledger-unlock',
      params: {
        hdPath,
      },
    });
  }

  signTransaction(
    hdPath: string,
    tx: string,
    to: string,
  ): Promise<{
    s: string;
    v: string;
    r: string;
  }> {
    return this._sendMessage({
      action: 'ledger-sign-transaction',
      params: {
        tx,
        hdPath,
        to,
      },
    });
  }

  async signPersonalMessage(
    hdPath: string,
    message: string,
  ): Promise<{
    v: number;
    s: string;
    r: string;
  }> {
    return this._sendMessage({
      action: 'ledger-sign-personal-message',
      params: {
        hdPath,
        message,
      },
    });
  }

  /* PRIVATE METHODS */
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
        target: 'LEDGER-IFRAME',
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
