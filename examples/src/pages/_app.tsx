import 'antd/dist/antd.css';

export default ({
  Component,
  ...pageProps
}: {
  Component: React.ComponentType;
}) => <Component {...pageProps} />;
