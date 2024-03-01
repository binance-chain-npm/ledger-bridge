import React, { useState, useEffect } from 'react';
import { Button, Card, notification, Input } from 'antd';
import { BBCLedgerBridge } from '@bnb-chain/ledger-bridge';
import { Transaction, crypto } from '@bnb-chain/javascript-sdk';

const bridge = new BBCLedgerBridge();
bridge.setHrp('tbnb');
const fakeTx = new Transaction({
  accountNumber: 1,
  chainId: 'bnbchain-1000',
  memo: '',
  msg: {},
  // type: 'NewOrderMsg',
  sequence: 29,
  source: 0,
});
const baseHdPath = '44/714/0/0/0';

const GetAddressCard = () => {
  const [address, setAddress] = React.useState<
    { address: string; hdPath: string }[]
  >([]);
  const [loading, setLoading] = React.useState(false);

  const handle = React.useCallback(async () => {
    setLoading(true);

    try {
      setAddress(await bridge.getFirstPage(baseHdPath));
    } catch (e) {
      console.error(e);
      notification.error({ message: e.message || e });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      console.log(address[0] && (await bridge.getPublicKey(baseHdPath)));
    })();
  }, [address]);

  return (
    <Card
      bordered={false}
      loading={loading}
      title={
        <div>
          Ledger BBC Account Address{' '}
          <Button size="small" onClick={handle}>
            Get address
          </Button>
        </div>
      }>
      {address.map(item => (
        <p key={item.address}>
          {item.address} (balance: {item.hdPath})
        </p>
      ))}
    </Card>
  );
};

const SignTransactionCard = () => {
  const [tx, setTx] = React.useState({});
  const [loading, setLoading] = React.useState(false);
  const handle = React.useCallback(async () => {
    try {
      setLoading(true);
      const _tx = await bridge.signTransaction(fakeTx, baseHdPath);
      setTx(_tx);
    } catch (e) {
      console.error(e);
      notification.error({ message: e.message || e });
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <Card
      bordered={false}
      title={
        <div>
          Ledger BBC SignTransaction{' '}
          <Button size="small" onClick={handle}>
            Sign
          </Button>
        </div>
      }
      loading={loading}>
      <pre>tx: {JSON.stringify(fakeTx, null, 2)}</pre>
      <pre>signed tx: {JSON.stringify(tx, null, 2)}</pre>
    </Card>
  );
};

const SignMessage = () => {
  const [hdPath, setHdPath] = useState(baseHdPath);
  const [message, setMessage] = useState('');
  const [signedMsg, setSignedMsg] = useState('');
  const [loading, setLoading] = React.useState(false);

  const handle = React.useCallback(async () => {
    try {
      setLoading(true);
      const m = fakeTx.getSignBytes().toString('hex');

      const msg = await bridge.signMessage(m, hdPath);
      fakeTx.addSignature(
        crypto.getPublicKey(await bridge.getPublicKey(hdPath)),
        Buffer.from(msg, 'hex'),
      );
      console.log(fakeTx.serialize());
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
          Ledger BBC SignMessage{' '}
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
  <Card bordered={true} bodyStyle={{ background: 'lightgreen' }}>
    <GetAddressCard />
    <SignTransactionCard />
    <SignMessage />
  </Card>
);
