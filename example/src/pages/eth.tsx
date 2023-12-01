import { useState, useCallback, useEffect } from 'react';
import { BSCLedgerBridge } from '@bnb-chain/ledger-bridge';
import { FeeMarketEIP1559Transaction } from '@ethereumjs/tx';
import Common, { Chain, Hardfork } from '@ethereumjs/common';
import { Button, Card, notification, Input } from 'antd';
import Web3 from 'web3';

const hdPaths = {
  LedgerLive: `m/44'/60'/0'/0/0`,
  Legacy: `m/44'/60'/0'`,
};
const bridge = new BSCLedgerBridge();
const common = new Common({ chain: Chain.Ropsten, hardfork: Hardfork.London });
const fakeTx = FeeMarketEIP1559Transaction.fromTxData(
  {
    nonce: '0x00',
    gasLimit: '0x5208',
    to: '0x0000000000000000000000000000000000000000',
    value: '0x2386F26FC10000',
    chainId: '0x03',
    type: '0x02',
    maxFeePerGas: '0x09184e72a000',
    maxPriorityFeePerGas: '0x01',
  },
  {
    common,
  },
);

const GetAddressCard = () => {
  const [address, setAddress] = useState<{ address: string; hdPath: string }[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const handle = useCallback(async () => {
    setLoading(true);

    try {
      setAddress(await bridge.getFirstPage(hdPaths.LedgerLive));
    } catch (e) {
      console.error(e);
      notification.error({ message: e.message || e });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      console.log(
        address[0] && (await bridge.getPublicKey(hdPaths.LedgerLive)),
      );
    })();
  }, [address]);

  return (
    <Card
      bordered={false}
      loading={loading}
      title={
        <div>
          Ledger ETH Account Address{' '}
          <Button size="small" onClick={handle}>
            Get address
          </Button>
        </div>
      }>
      {address.map(item => (
        <p key={item.address}>
          {item.address} (hdPath: {item.hdPath})
        </p>
      ))}
    </Card>
  );
};

const SignTransactionCard = () => {
  const [loading, setLoading] = useState(false);
  const [tx, setTx] = useState(JSON.stringify(fakeTx));
  const [signedTx, setSingedTx] = useState('');

  const handleChange = useCallback(async evt => {
    setTx(evt.target.value);
  }, []);

  const handleSign = useCallback(async () => {
    try {
      setLoading(true);
      const _fakeTx = FeeMarketEIP1559Transaction.fromTxData(JSON.parse(tx), {
        common,
      });
      const _tx = await bridge.signTransaction(
        _fakeTx as any,
        "m/44'/60'/0'/0/0",
      );

      console.log(_tx.toJSON());
      setSingedTx(`0x${_tx.serialize().toString('hex')}`);
    } catch (e) {
      console.error(e);
      notification.error({ message: e.message || e });
    } finally {
      setLoading(false);
    }
  }, [tx]);

  const haneleSend = useCallback(async () => {
    const web3 = new Web3(
      'https://ropsten.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    );

    const result = await web3.eth.sendSignedTransaction(signedTx);
    console.log(result);
  }, [signedTx]);

  return (
    <Card
      bordered={false}
      loading={loading}
      title={<div>Ledger ETH SignTransaction (EIP-1559) </div>}>
      <Input.TextArea
        style={{ width: 300, height: 200, marginBottom: 10 }}
        value={tx}
        onChange={handleChange}
      />
      <div>
        <Button.Group>
          <Button onClick={handleSign}>Sign</Button>
          <Button onClick={haneleSend}>Send</Button>
        </Button.Group>
      </div>

      <pre>SignedTx: {signedTx}</pre>
    </Card>
  );
};

const SignMessage = () => {
  const [hdPath, setHdPath] = useState(hdPaths.LedgerLive);
  const [message, setMessage] = useState('');
  const [signedMsg, setSignedMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = useCallback(async () => {
    try {
      setLoading(true);
      await bridge.unlock();
      const msg = await bridge.signMessage(message, hdPath);
      setSignedMsg(msg);
    } catch (e) {
      console.error(e);
      notification.error({ message: e.message || e });
    } finally {
      setLoading(false);
    }
  }, [hdPath, message]);

  return (
    <Card
      bordered={false}
      loading={loading}
      title={
        <div>
          Ledger ETH SignMessage (EIP-1559){' '}
          <Button size="small" onClick={handle}>
            Sign
          </Button>
        </div>
      }>
      hdPath: <Input value={hdPath} onChange={e => setHdPath(e.target.value)} />
      message:{' '}
      <Input value={message} onChange={e => setMessage(e.target.value)} />
      <pre>Signed message: {JSON.stringify(signedMsg, null, 2)}</pre>
    </Card>
  );
};

export default () => (
  <Card bordered={true} bodyStyle={{ background: 'lightblue' }}>
    <GetAddressCard />
    <SignTransactionCard />
    <SignMessage />
  </Card>
);
