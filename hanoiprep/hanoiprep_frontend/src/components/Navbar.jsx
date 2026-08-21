import React, { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const Navbar = () => {
  const { currentUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          HanoiPrep
        </Link>
        <ul className="navbar-menu">
          <li className="nav-item">
            <Link to="/" className="nav-link">
              Home
            </Link>
          </li>
          {currentUser?.role === "ROLE_ADMIN" && (
            <li className="nav-item">
              <Link to="/admin/users" className="nav-link">
                User Management
              </Link>
            </li>
          )}
          {currentUser?.role === "ROLE_COURSE_PROVIDER" && (
            <>
              <li className="nav-item">
                <Link to="/provider/lessons/upload" className="nav-link">
                  Create Lesson
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/provider/feedbacks" className="nav-link">
                  Feedbacks
                </Link>
              </li>
            </>
          )}
          {(currentUser?.role === "ROLE_LEARNER" || currentUser?.role === "ROLE_COURSE_PROVIDER") && (
            <li className="nav-item">
              <Link to="/learner/lessons" className="nav-link">
                Lessons
              </Link>
            </li>
          )}
          {currentUser ? (
            <>
              <li className="nav-item">
                <span className="nav-user">Welcome, {currentUser.username}</span>
              </li>
              <li className="nav-item">
                <button onClick={handleLogout} className="nav-btn nav-btn-logout">
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li className="nav-item">
                <Link to="/login" className="nav-link">
                  Login
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/signup" className="nav-btn">
                  Sign Up
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
