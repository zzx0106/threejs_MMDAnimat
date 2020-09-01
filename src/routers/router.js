import React from 'react';

import { BrowserRouter as Router, Route, Switch, Link } from 'react-router-dom';
// 路由懒加载
import AsyncRouter from '@/utils/asyncRouter';
import AsyncComponent from '../utils/asyncComponent';
// import Home from 'bundle-loader?lazy&name=home!pages/Home/Home';
import Home from '../pages/Home/Home'; // 在webpack中配置了bundle-loader
// import Miku from '@/pages/Miku/Miku'; // 在webpack中配置了bundle-loader
import Loading from '@/components/Loading';
// const createComponent = (component) => (props) => (
//   <AsyncRouter load={component}>{(Component) => (Component ? <Component {...props} /> : <Loading />)}</AsyncRouter>
// );
const Miku = AsyncComponent(() => import('@/pages/Miku/Miku'));
const getRouter = () => {
  return (
    <Router>
      <Switch>
        <Route exact path="/" component={Home} />
        <Route path="/Miku" component={Miku} />
      </Switch>
    </Router>
  );
};

export default getRouter;
