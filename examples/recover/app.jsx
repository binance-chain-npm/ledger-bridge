import { BSCLedgerBridge } from '../../dist';
import { Button, Card, notification, Table } from 'antd';
import React from 'react';
import { publicToAddress, toChecksumAddress } from 'ethereumjs-util';

const bridge = new BSCLedgerBridge();

const hdPaths = {
  LedgerLive: `m/44'/60'/0'/0/0`,
  Legacy: `m/44'/60'/0'`,
};

const GetLegacyAddressCard = () => {
  const [address, setAddress] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const handle = React.useCallback(async () => {
    setLoading(true);

    try {
      bridge.setHdPath(hdPaths.Legacy);
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
      loading={loading}
      title={
        <div>
          Ledger(legacy) Addresses <h5>hdPath: {hdPaths.Legacy}</h5>
          <Button size="small" onClick={handle}>
            Get addresses
          </Button>
        </div>
      }
    >
      {address.map((item) => {
        return <p key={item.address}>{item.address}</p>;
      })}
    </Card>
  );
};

const GetLedgerLiveAddressCard = () => {
  const [address, setAddress] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const handle = React.useCallback(async () => {
    setLoading(true);

    try {
      bridge.setHdPath(hdPaths.LedgerLive);
      await bridge.unlock();
      setAddress(await bridge.getNextPage());
    } catch (e) {
      console.error(e);
      notification.error({ message: e.message || e });
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <Card
      loading={loading}
      title={
        <div>
          Ledger(ledger live) Addresses <h5>hdPath: {hdPaths.LedgerLive}</h5>
          <Button size="small" onClick={handle}>
            Get addresses
          </Button>
        </div>
      }
    >
      {address.map((item) => {
        return <p key={item.address}>{item.address}</p>;
      })}
    </Card>
  );
};

const columns = [
  {
    title: 'Address',
    dataIndex: 'address',
  },
  {
    title: 'HDPath',
    dataIndex: 'hdPath',
  },
  {
    title: 'PrivateKey',
    dataIndex: 'privateKey',
  },
];

const GetMissingAddressCard = () => {
  const [address, setAddress] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const handle = React.useCallback(async () => {
    setLoading(true);

    try {
      const _addrs = [];
      for (let i = 0; i < 5; i++) {
        const hdPath = `m/44'/60'/${i}'/0/0`;
        await bridge.unlock(hdPath);
        const parent = bridge.hdk.derive(hdPath);
        for (let j = 0; j < 5; j++) {
          const dkey = parent.deriveChild(j);
          const address = publicToAddress(dkey.publicKey, true).toString('hex');
          const _addr = toChecksumAddress(`0x${address}`);

          _addrs.push({
            address: _addr,
            hdPath,
            privateKey: dkey.privateKey,
          });
        }
      }
      setAddress(_addrs);
    } catch (e) {
      console.error(e);
      notification.error({ message: e.message || e });
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <Card
      loading={loading}
      title={
        <div>
          <span>Ledger(Missing) Addresses</span>&nbsp;
          <Button size="small" onClick={handle}>
            Get addresses
          </Button>
        </div>
      }
    >
      <Table dataSource={address} columns={columns} pagination={false} size="small" />
    </Card>
  );
};

export const App = () => {
  return (
    <>
      <Card bordered bodyStyle={{ background: 'lightblue' }}>
        <GetLegacyAddressCard />
        <GetLedgerLiveAddressCard />
      </Card>
      <Card bordered bodyStyle={{ background: 'lightgreen' }}>
        <GetMissingAddressCard />
      </Card>
    </>
  );
};
