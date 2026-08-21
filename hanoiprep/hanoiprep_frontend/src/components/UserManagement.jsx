import React, { useState, useEffect, useContext } from "react";
import UserService from "../services/user.service";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editUserId, setEditUserId] = useState(null);
  const [formData, setFormData] = useState({
    username: "",
    gmail: "",
    password: "",
    role: "ROLE_LEARNER",
  });
  const [modalError, setModalError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        const data = response.data && response.data.result ? response.data.result : response.data;
        setUsers(Array.isArray(data) ? data : []);
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
          setSuccessMessage("User deactivated successfully!");
          fetchUsers();
          setTimeout(() => setSuccessMessage(""), 4000);
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
          setSuccessMessage("User activated successfully!");
          fetchUsers();
          setTimeout(() => setSuccessMessage(""), 4000);
        },
        (error) => {
          setMessage("Failed to activate user.");
        }
      );
    }
  };

  const handleOpenCreateModal = () => {
    setIsEditMode(false);
    setEditUserId(null);
    setFormData({
      username: "",
      gmail: "",
      password: "",
      role: "ROLE_LEARNER",
    });
    setModalError("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setIsEditMode(true);
    setEditUserId(user.id);
    setFormData({
      username: user.username || "",
      gmail: user.gmail || "",
      password: "",
      role: user.role || "ROLE_LEARNER",
    });
    setModalError("");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setEditUserId(null);
    setModalError("");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setModalError("");

    if (!formData.username.trim() || formData.username.trim().length < 3) {
      setModalError("Username must be at least 3 characters long.");
      return;
    }

    if (!formData.gmail || !formData.gmail.trim()) {
      setModalError("Gmail is required and cannot be empty.");
      return;
    }

    if (!isEditMode && (!formData.password || formData.password.length < 6)) {
      setModalError("Password must be at least 6 characters long.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode) {
        await UserService.updateUser(editUserId, {
          username: formData.username.trim(),
          gmail: formData.gmail.trim(),
          role: formData.role,
        });
        setSuccessMessage("User updated successfully!");
      } else {
        await UserService.createUser({
          username: formData.username.trim(),
          gmail: formData.gmail ? formData.gmail.trim() : null,
          password: formData.password,
          role: formData.role,
        });
        setSuccessMessage("User created successfully!");
      }

      setIsModalOpen(false);
      fetchUsers();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (error) {
      const resMessage =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        (isEditMode ? "Failed to update user." : "Failed to create user.");
      setModalError(resMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-card">
        <div className="admin-header">
          <h2 className="admin-title">User Management</h2>
          <button className="btn-add-user" onClick={handleOpenCreateModal}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add User
          </button>
        </div>

        {message && <div className="alert alert-danger">{message}</div>}
        {successMessage && <div className="alert alert-success">{successMessage}</div>}

        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Gmail</th>
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
                  <td>{user.gmail || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>N/A</span>}</td>
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
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                        onClick={() => handleOpenEditModal(user)}
                      >
                        Edit
                      </button>
                      {user.role === 'ROLE_ADMIN' ? (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginLeft: '0.5rem' }}>Protected</span>
                      ) : user.active ? (
                        <button
                          className="btn-delete"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                          onClick={() => handleDeactivate(user.id)}
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          className="btn btn-primary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                          onClick={() => handleActivate(user.id)}
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{isEditMode ? `Edit User #${editUserId}` : "Add New User"}</h3>
              <button className="modal-close-btn" onClick={handleCloseModal}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSaveUser}>
              <div className="modal-body">
                {modalError && <div className="alert alert-danger" style={{ marginTop: 0, marginBottom: '1rem' }}>{modalError}</div>}

                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    className="form-control"
                    placeholder="Enter username (min 3 characters)"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="gmail">Gmail / Email</label>
                  <input
                    type="email"
                    id="gmail"
                    name="gmail"
                    className="form-control"
                    placeholder="Enter Gmail address (e.g. user@gmail.com)"
                    value={formData.gmail}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                {!isEditMode && (
                  <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      className="form-control"
                      placeholder="Enter password (min 6 characters)"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="role">Role</label>
                  <select
                    id="role"
                    name="role"
                    className="form-select"
                    value={formData.role}
                    onChange={handleInputChange}
                  >
                    <option value="ROLE_LEARNER">Learner</option>
                    <option value="ROLE_COURSE_PROVIDER">Course Provider</option>
                    <option value="ROLE_ADMIN">Admin</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0.6rem 1.25rem', fontSize: '0.95rem' }}
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '0.6rem 1.5rem', fontSize: '0.95rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="spinner" style={{ width: '1rem', height: '1rem' }}></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    isEditMode ? "Update User" : "Create User"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;

