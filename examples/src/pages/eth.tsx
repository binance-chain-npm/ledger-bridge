import { useState, useCallback, useEffect } from 'react';
import { BSCLedgerBridge } from '@binance-chain/ledger-bridge';
import { FeeMarketEIP1559Transaction } from '@ethereumjs/tx';
import { Button, Card, notification, Input } from 'antd';

const hdPaths = {
  LedgerLive: `m/44'/60'/0'/0/0`,
  Legacy: `m/44'/60'/0'`,
};
const bridge = new BSCLedgerBridge();
const fakeTx = FeeMarketEIP1559Transaction.fromTxData({
  nonce: '0x00',
  gasLimit: '0x2710',
  to: '0x0000000000000000000000000000000000000000',
  value: '0x00',
  data: '0x7f7465737432000000000000000000000000000000000000000000000000000000600057',
  chainId: '0x01',
  type: '0x02',
  maxFeePerGas: '0x09184e72a000',
  maxPriorityFeePerGas: '0x01',
});

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
  const [tx, setTx] = useState({});
  const [loading, setLoading] = useState(false);
  const handle = useCallback(async () => {
    try {
      setLoading(true);
      const _tx = await bridge.signTransaction(fakeTx, "m/44'/60'/0'/0");

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
      loading={loading}
      title={
        <div>
          Ledger ETH SignTransaction (EIP-1559){' '}
          <Button size="small" onClick={handle}>
            Sign
          </Button>
        </div>
      }>
      <pre>tx data: {JSON.stringify(fakeTx, null, 2)}</pre>
      <pre>signed tx: {JSON.stringify(tx, null, 2)}</pre>
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
