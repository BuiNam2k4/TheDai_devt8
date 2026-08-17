import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const Signup = () => {
  const [username, setUsername] = useState("");
  const [gmail, setGmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("ROLE_LEARNER");
  const [successful, setSuccessful] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const { register } = useContext(AuthContext);

  const handleRegister = (e) => {
    e.preventDefault();
    setMessage("");
    setSuccessful(false);
    setLoading(true);

    if (!username.trim() || username.trim().length < 3) {
      setLoading(false);
      setMessage("Username must be at least 3 characters.");
      return;
    }

    if (!gmail.trim()) {
      setLoading(false);
      setMessage("Gmail is required and cannot be empty.");
      return;
    }

    if (!password || password.length < 6) {
      setLoading(false);
      setMessage("Password must be at least 6 characters.");
      return;
    }

    register(username.trim(), gmail.trim(), password, role).then(
      (response) => {
        setLoading(false);
        setMessage(response.data.message || "Registration successful!");
        setSuccessful(true);
      },
      (error) => {
        setLoading(false);
        const resMessage =
          (error.response &&
            error.response.data &&
            error.response.data.message) ||
          error.message ||
          error.toString();

        setMessage(resMessage);
        setSuccessful(false);
      }
    );
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Create Account</h2>
        <p className="auth-subtitle">Sign up to get started</p>

        <form onSubmit={handleRegister} className="auth-form">
          {!successful && (
            <>
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  className="form-control"
                  name="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="gmail">Gmail / Email</label>
                <input
                  type="email"
                  className="form-control"
                  name="gmail"
                  value={gmail}
                  onChange={(e) => setGmail(e.target.value)}
                  placeholder="Enter your Gmail address"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  className="form-control"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="role">Role</label>
                <select
                  className="form-control"
                  name="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="ROLE_LEARNER">Learner</option>
                  <option value="ROLE_COURSE_PROVIDER">Course Provider</option>
                </select>
              </div>

              <div className="form-group">
                <button className="auth-btn" disabled={loading}>
                  {loading && <span className="spinner"></span>}
                  <span>Sign Up</span>
                </button>
              </div>
            </>
          )}

          {message && (
            <div className="form-group">
              <div
                className={
                  successful ? "alert alert-success" : "alert alert-danger"
                }
                role="alert"
              >
                {message}
              </div>
              {successful && (
                <Link to="/login" className="btn-link-login">
                  Go to Login
                </Link>
              )}
            </div>
          )}
        </form>
        {!successful && (
          <p className="auth-footer">
            Already have an account? <Link to="/login">Log In</Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default Signup;
