import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";

const Home = () => {
  const { currentUser } = useContext(AuthContext);

  return (
    <div className="home-container">
      <header className="home-header">
        <h1>Welcome to HanoiPrep</h1>
        {currentUser ? (
          <div className="home-content">
            <p>Hello, <strong>{currentUser.username}</strong>!</p>
            <p>You are successfully logged in. Explore your dashboard to start learning.</p>
          </div>
        ) : (
          <div className="home-content">
            <p>HanoiPrep is the best place to prepare for your exams.</p>
            <div className="home-actions">
              <Link to="/login" className="btn btn-primary">Login</Link>
              <Link to="/signup" className="btn btn-secondary">Sign Up</Link>
            </div>
          </div>
        )}
      </header>
    </div>
  );
};

export default Home;
