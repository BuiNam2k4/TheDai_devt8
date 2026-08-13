import React, { useState, useEffect, useContext } from "react";
import UserService from "../services/user.service";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if not admin
    if (!currentUser || currentUser.role !== "ROLE_ADMIN") {
      navigate("/");
      return;
    }

    fetchUsers();
  }, [currentUser, navigate]);

  const fetchUsers = () => {
    UserService.getAllUsers().then(
      (response) => {
        setUsers(response.data);
      },
      (error) => {
        setMessage("Unauthorized or error fetching users.");
      }
    );
  };

  const handleDeactivate = (id) => {
    if (window.confirm("Are you sure you want to deactivate this user?")) {
      UserService.deleteUser(id).then(
        () => {
          fetchUsers();
        },
        (error) => {
          setMessage("Failed to deactivate user.");
        }
      );
    }
  };

  const handleActivate = (id) => {
    if (window.confirm("Are you sure you want to activate this user?")) {
      UserService.activateUser(id).then(
        () => {
          fetchUsers();
        },
        (error) => {
          setMessage("Failed to activate user.");
        }
      );
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-card">
        <h2 className="admin-title">User Management</h2>
        {message && <div className="alert alert-danger">{message}</div>}

        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.username}</td>
                  <td>
                    <span className={`badge ${user.role}`}>
                      {user.role === 'ROLE_ADMIN' ? 'Admin' :
                        user.role === 'ROLE_COURSE_PROVIDER' ? 'Course Provider' : 'Learner'}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: user.active ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                      {user.active ? 'Active' : 'Deactive'}
                    </span>
                  </td>
                  <td>
                    {user.role === 'ROLE_ADMIN' ? (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Active</span>
                    ) : user.active ? (
                      <button
                        className="btn-delete"
                        onClick={() => handleDeactivate(user.id)}
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                        onClick={() => handleActivate(user.id)}
                      >
                        Activate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
