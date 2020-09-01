import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Switch, Link } from 'react-router-dom';
import 'assets/css/pages/Home.scss';
class Home extends Component {
    constructor(props) {
        super(props);
        this.state = {
            count: 0
        };
    }
    render() {
        return (
            <div className="home-container">
                <h1 className="router-title">Three 指南</h1>
                <h5 className="sub-title">demo list</h5>
                <ul>
                    <li className="home-link">
                        <Link to="/Miku">FREELY_TOMORROW</Link>
                    </li>
                </ul>
            </div>
        );
    }
}
export default Home;
