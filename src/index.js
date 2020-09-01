// reactor版本 1.2.0
import React from 'react';
import ReactDom from 'react-dom';
import Routers from 'routers/router';
import '@/assets/css/public/index.scss';
import imgLog from 'img-log';
// 导入three
import * as THREE from 'three';
const MMDParser = require('mmd-parser');
window.THREE = THREE;
window.MMDParser = MMDParser;

imgLog(require('assets/images/logo_g.gif'), 50);
ReactDom.render(Routers(), document.getElementById('app'));
