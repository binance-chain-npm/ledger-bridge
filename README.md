# @bnb-chain/ledger-bridge

## Usage

```jsx
import { BSCLedgerBridge } from '@bnb-chain/ledger-bridge';

const bridge = new BSCLedgerBridge();
const ledgerLive = `m/44'/60'/0'/0/0`;

await bridge.getFirstPage(ledgerLive);
```

## Development

1. git clone
2. yarn install
3. yarn start
4. cd example && yarn dev
5. You can visit it by http://localhost:8080/

## License

See [LICENSE](./LICENSE) for more information.
