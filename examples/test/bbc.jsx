import { BBCLedgerBridge } from '../../dist';
import { useState } from 'react';
import { Transaction } from '@binance-chain/javascript-sdk';
import { Button, Card, notification, Input } from 'antd';
import React from 'react';

const bridge = new BBCLedgerBridge();
const fakeTx = new Transaction({
  accountNumber: 1,
  chainId: 'bnbchain-1000',
  memo: '',
  msg: {},
  type: 'NewOrderMsg',
  sequence: 29,
  source: 0,
});
const hdPath = '44/714/0/0/0';

const GetAddressCard = () => {
  const [address, setAddress] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const handle = React.useCallback(async () => {
    setLoading(true);

    try {
      await bridge.unlock();
      setAddress(await bridge.getFirstPage());
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
      loading={loading}
      title={
        <div>
          Ledger BBC Account Address{' '}
          <Button size="small" onClick={handle}>
            Get address
          </Button>
        </div>
      }
    >
      {address.map((item) => {
        return (
          <p key={item.address}>
            {item.address} (balance: {item.balance})
          </p>
        );
      })}
    </Card>
  );
};

const SignTransactionCard = () => {
  const [tx, setTx] = React.useState({});
  const [loading, setLoading] = React.useState(false);
  const handle = React.useCallback(async () => {
    try {
      setLoading(true);
      await bridge.unlock();

      const splitHdPath = hdPath.split('/');
      const _tx = await bridge.signTransaction(fakeTx, splitHdPath);
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
      loading={loading}
    >
      <pre>tx: {JSON.stringify(fakeTx, null, 2)}</pre>
      <pre>signed tx: {JSON.stringify(tx, null, 2)}</pre>
    </Card>
  );
};

const SignMessage = () => {
  const [address, setAddress] = useState('');
  const [message, setMessage] = useState('');
  const [signedMsg, setSignedMsg] = useState('');
  const [loading, setLoading] = React.useState(false);

  const handle = React.useCallback(async () => {
    try {
      setLoading(true);
      await bridge.unlock();
      const splitHdPath = hdPath.split('/');
      const msg = await bridge.signMessage(message, splitHdPath);
      setSignedMsg(msg);
    } catch (e) {
      console.error(e);
      notification.error({ message: e.message || e });
    } finally {
      setLoading(false);
    }
  }, [address, message]);

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
      }
    >
      address: <Input value={address} onChange={(e) => setAddress(e.target.value)} />
      message: <Input value={message} onChange={(e) => setMessage(e.target.value)} />
      <pre>Signed message: {JSON.stringify(signedMsg, null, 2)}</pre>
    </Card>
  );
};

export const BbcTestApp = () => {
  return (
    <Card bordered bodyStyle={{ background: 'lightgreen' }}>
      <GetAddressCard />
      <SignTransactionCard />
      <SignMessage />
    </Card>
  );
};
