import TransportU2F from '@ledgerhq/hw-transport-u2f';
import LedgerEth from '@ledgerhq/hw-app-eth';
import Transport from '@ledgerhq/hw-transport';

export default class LedgerBridge {
  transport: Transport;
  app: LedgerEth;

  constructor() {
    this.addEventListeners();
    this.transport = {} as Transport;
    this.app = {} as LedgerEth;
  }

  addEventListeners() {
    window.addEventListener(
      'message',
      async (e) => {
        if (e && e.data && e.data.target === 'LEDGER-IFRAME') {
          const { action, params } = e.data;
          const replyAction = `${action}-reply`;

          switch (action) {
            case 'ledger-unlock':
              this.unlock(replyAction, params.hdPath);
              break;
            case 'ledger-sign-transaction':
              this.signTransaction(replyAction, params.hdPath, params.tx);
              break;
            case 'ledger-sign-personal-message':
              this.signPersonalMessage(replyAction, params.hdPath, params.message);
              break;
            case 'ledger-close-bridge':
              this.cleanUp(replyAction);
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
      this.transport = await TransportU2F.create();
      this.app = new LedgerEth(this.transport);
    } catch (e) {
      console.log('LEDGER:::CREATE APP ERROR', e);
      throw e;
    }
  }

  cleanUp(replyAction?: string) {
    this.app = {} as LedgerEth;
    if (this.transport) {
      this.transport.close();
    }
    if (replyAction) {
      this.sendMessageToExtension({
        action: replyAction,
        success: true,
      });
    }
  }

  async unlock(replyAction: string, hdPath: string) {
    try {
      await this.makeApp();
      const res = await this.app.getAddress(hdPath, false, true);
      this.sendMessageToExtension({
        action: replyAction,
        success: true,
        payload: res,
      });
    } catch (err) {
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

  async signTransaction(replyAction: string, hdPath: string, tx: any) {
    try {
      await this.makeApp();
      const res = await this.app.signTransaction(hdPath, tx);
      this.sendMessageToExtension({
        action: replyAction,
        success: true,
        payload: res,
      });
    } catch (err) {
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

  async signPersonalMessage(replyAction: string, hdPath: string, message: string) {
    try {
      await this.makeApp();

      const res = await this.app.signPersonalMessage(hdPath, message);
      this.sendMessageToExtension({
        action: replyAction,
        success: true,
        payload: res,
      });
    } catch (err) {
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

  ledgerErrToMessage(err: any) {
    const isU2FError = (err: any) => !!err && !!err.metaData;
    const isStringError = (err: any) => typeof err === 'string';
    const isErrorWithId = (err: any) => err.hasOwnProperty('id') && err.hasOwnProperty('message');
    const isWrongAppError = (err: any) => String(err.message || err).includes('6804');
    const isLedgerLockedError = (err: any) => err.message && err.message.includes('OpenFailed');

    // https://developers.yubico.com/U2F/Libraries/Client_error_codes.html
    if (isU2FError(err)) {
      if (err.metaData.code === 5) {
        return 'LEDGER_TIMEOUT';
      }
      return err.metaData.type;
    }

    if (isWrongAppError(err)) {
      return 'LEDGER_WRONG_APP';
    }

    if (isLedgerLockedError(err) || (isStringError(err) && err.includes('6801'))) {
      return 'LEDGER_LOCKED';
    }

    if (isErrorWithId(err)) {
      // Browser doesn't support U2F
      if (err.message.includes('U2F not supported')) {
        return 'U2F_NOT_SUPPORTED';
      }
    }

    // Other
    return err.toString();
  }
}
