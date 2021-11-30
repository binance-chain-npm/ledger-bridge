import React from 'react';
import ReactDOM from 'react-dom';
import 'antd/dist/antd.css';
import { BscTestApp } from './bsc';
import { BbcTestApp } from './bbc';

ReactDOM.render(
  <>
    <BscTestApp />
    <BbcTestApp />
  </>,
  document.getElementById('root'),
);
