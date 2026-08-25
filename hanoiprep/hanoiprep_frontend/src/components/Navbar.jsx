import React, { useContext } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const Navbar = () => {
  const { currentUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getLinkStyle = (path) => ({
    color: location.pathname === path ? 'var(--primary-color)' : 'var(--text-muted)',
    fontWeight: location.pathname === path ? '600' : '500',
    fontSize: '0.95rem',
    textDecoration: 'none',
    transition: 'color 0.2s ease',
    padding: '0.4rem 0.2rem',
    borderBottom: location.pathname === path ? '2px solid var(--primary-color)' : '2px solid transparent'
  });

  return (
    <nav className="navbar">
      <div className="navbar-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2rem' }}>
        {/* Cột Trái: Logo */}
        <Link to="/" className="navbar-logo" style={{ textDecoration: 'none', flexShrink: 0 }}>
          HanoiPrep
        </Link>

        {/* Cột Giữa: Các mục điều hướng chia đều thoáng đãng */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2.5rem',
          flex: 1,
          flexWrap: 'wrap'
        }}>
          <Link to="/" style={getLinkStyle('/')}>
            Home
          </Link>

          {currentUser?.role === "ROLE_ADMIN" && (
            <Link to="/admin/users" style={getLinkStyle('/admin/users')}>
              User Management
            </Link>
          )}

          {currentUser?.role === "ROLE_COURSE_PROVIDER" && (
            <>
              <Link to="/provider/lessons/upload" style={getLinkStyle('/provider/lessons/upload')}>
                Create Lesson
              </Link>
              <Link to="/provider/feedbacks" style={getLinkStyle('/provider/feedbacks')}>
                Feedbacks
              </Link>
            </>
          )}

          {(currentUser?.role === "ROLE_LEARNER" || currentUser?.role === "ROLE_COURSE_PROVIDER") && (
            <Link to="/learner/lessons" style={getLinkStyle('/learner/lessons')}>
              Lessons
            </Link>
          )}

          {currentUser?.role === "ROLE_LEARNER" && (
            <Link to="/learner/history" style={getLinkStyle('/learner/history')}>
              Lịch Sử & Điểm Số
            </Link>
          )}
        </div>

        {/* Cột Phải: Thông tin người dùng & Đăng xuất */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexShrink: 0 }}>
          {currentUser ? (
            <>
              <span className="nav-user" style={{ fontSize: '0.9rem' }}>
                Welcome, {currentUser.username}
              </span>
              <button onClick={handleLogout} className="nav-btn nav-btn-logout">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">
                Login
              </Link>
              <Link to="/signup" className="nav-btn">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
