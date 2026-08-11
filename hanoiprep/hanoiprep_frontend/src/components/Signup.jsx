import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const Signup = () => {
  const [username, setUsername] = useState("");
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

    if (username.length >= 3 && password.length >= 6) {
      register(username, password, role).then(
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
    } else {
      setLoading(false);
      setMessage("Username must be at least 3 characters and password at least 6 characters.");
      setSuccessful(false);
    }
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
