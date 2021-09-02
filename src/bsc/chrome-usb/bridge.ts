import TransportUsb from '@ledgerhq/hw-transport-webusb';
import Transport from '@ledgerhq/hw-transport';
import LedgerEth from '@ledgerhq/hw-app-eth';

export class ChromeLedgerBridge {
  transport: Transport;
  app: LedgerEth;

  constructor() {
    this.transport = {} as Transport;
    this.app = {} as LedgerEth;
  }

  async makeApp() {
    try {
      this.transport = await TransportUsb.create();
      this.app = new LedgerEth(this.transport);
    } catch (e) {
      console.log('LEDGER:::CREATE APP ERROR', e);
      throw e;
    }
  }

  async cleanUp() {
    this.app = {} as LedgerEth;
    try {
      this.transport?.close && (await this.transport.close());
    } catch (e) {
      // ignore error.
      console.warn(e);
    }
  }

  async unlock(hdPath: string) {
    try {
      await this.makeApp();
      return await this.app.getAddress(hdPath, false, true);
    } catch (err) {
      throw new Error(this.ledgerErrToMessage(err));
    } finally {
      await this.cleanUp();
    }
  }

  async signTransaction(hdPath: string, tx: string) {
    try {
      await this.makeApp();
      return await this.app.signTransaction(hdPath, tx);
    } catch (err) {
      throw new Error(this.ledgerErrToMessage(err));
    } finally {
      await this.cleanUp();
    }
  }

  async signPersonalMessage(hdPath: string, message: string) {
    try {
      await this.makeApp();
      return await this.app.signPersonalMessage(hdPath, message);
    } catch (err) {
      throw new Error(this.ledgerErrToMessage(err));
    } finally {
      await this.cleanUp();
    }
  }

  ledgerErrToMessage(err: any) {
    const isStringError = (e: any) => typeof e === 'string';
    const isErrorWithId = (e: any) => e.hasOwnProperty('id') && e.hasOwnProperty('message');
    const isWrongAppError = (e: any) => {
      const m = String(e.message || e);
      return m.includes('0x6700') || m.includes('0x6e00');
    };
    const isLedgerLockedError = (e: any) => {
      const m = String(e.message || e);
      return m.includes('OpenFailed') || m.includes('0x6804');
    };
    const isRequireGesture = (e: any) => {
      const m = String(e.name || e);
      return m === 'TransportWebUSBGestureRequired' || m === 'TransportOpenUserCancelled';
    };

    if (__DEV__) console.error('error: ', err);
    if (isRequireGesture(err)) {
      return 'LEDGER_NEED_USB_PERMISSION';
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
