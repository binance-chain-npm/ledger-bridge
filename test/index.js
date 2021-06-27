import { BSCLedgerBridge } from '../dist/index';
import Transaction from 'ethereumjs-tx';

const bridge = new BSCLedgerBridge();
const fakeTx = new Transaction({
  nonce: '0x00',
  gasPrice: '0x09184e72a000',
  gasLimit: '0x2710',
  to: '0x0000000000000000000000000000000000000000',
  value: '0x00',
  data: '0x7f7465737432000000000000000000000000000000000000000000000000000000600057',
  // // EIP 155 chainId - mainnet: 1, ropsten: 3
  chainId: 1,
});
const fakeAccountAddress = '0xF30952A1c534CDE7bC471380065726fa8686dfB3';

const $getAddress = document.getElementById('getAddress');
const $signTx = document.getElementById('signTx');

bridge.setHdPath(`m/44'/60'/0'/0/0`);

$getAddress.onclick = async () => {
  try {
    const address = await bridge.unlock();
    $getAddress.innerText = `getAddress: ${address}`;
    // bridge.getFirstPage().then(t => console.log(t));
  } catch (e) {
    console.error(e);
    if (e.message === 'LEDGER_NEED_USB_PERMISSION') {
      alert('open permission modal.');
    }
  }
};

$signTx.onclick = async () => {
  try {
    const tx = await bridge.signTransaction(fakeAccountAddress, fakeTx, 0);
    console.log(tx);
  } catch (e) {
    console.error(e);
    if (e.message === 'LEDGER_NEED_USB_PERMISSION') {
      alert('open permission modal.');
    }
  }
};
