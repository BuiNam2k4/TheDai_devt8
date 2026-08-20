import React, { useState, useEffect, useContext } from 'react';
import UserService from '../services/user.service';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// Subcomponents
import UserStatsCards from './users/UserStatsCards';
import UserTable from './users/UserTable';
import UserFormModal from './users/UserFormModal';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editUserId, setEditUserId] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    gmail: '',
    password: '',
    role: 'ROLE_LEARNER',
  });
  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'ROLE_ADMIN') {
      navigate('/');
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
        setMessage('Không thể tải danh sách người dùng.');
      }
    );
  };

  const handleDeactivate = (id) => {
    if (window.confirm('Bạn có chắc chắn muốn khóa tài khoản này?')) {
      UserService.deleteUser(id).then(
        () => {
          setSuccessMessage('Đã khóa tài khoản người dùng thành công!');
          fetchUsers();
          setTimeout(() => setSuccessMessage(''), 4000);
        },
        (error) => {
          setMessage('Không thể khóa người dùng.');
        }
      );
    }
  };

  const handleActivate = (id) => {
    if (window.confirm('Bạn có chắc chắn muốn mở khóa cho tài khoản này?')) {
      UserService.activateUser(id).then(
        () => {
          setSuccessMessage('Đã mở khóa tài khoản thành công!');
          fetchUsers();
          setTimeout(() => setSuccessMessage(''), 4000);
        },
        (error) => {
          setMessage('Không thể mở khóa tài khoản.');
        }
      );
    }
  };

  const handleOpenCreateModal = () => {
    setIsEditMode(false);
    setEditUserId(null);
    setFormData({
      username: '',
      gmail: '',
      password: '',
      role: 'ROLE_LEARNER',
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setIsEditMode(true);
    setEditUserId(user.id);
    setFormData({
      username: user.username,
      gmail: user.gmail,
      password: '',
      role: user.role,
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setIsSubmitting(true);

    try {
      if (isEditMode) {
        const updateData = {
          username: formData.username,
          gmail: formData.gmail,
          role: formData.role,
        };
        if (formData.password) {
          updateData.password = formData.password;
        }

        await UserService.updateUser(editUserId, updateData);
        setSuccessMessage('Cập nhật thông tin người dùng thành công!');
      } else {
        await UserService.createUser(formData);
        setSuccessMessage('Tạo người dùng mới thành công!');
      }

      setIsModalOpen(false);
      fetchUsers();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      const errRes = err.response?.data?.message || 'Thao tác không thành công. Vui lòng kiểm tra lại.';
      setModalError(errRes);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '1150px', margin: '2rem auto', padding: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span>👥</span> Quản Lý Người Dùng
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            Quản trị tài khoản, phân quyền vai trò và trạng thái hoạt động trong hệ thống
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          style={{
            background: 'var(--primary-color)',
            color: 'white',
            border: 'none',
            padding: '0.65rem 1.25rem',
            borderRadius: '0.5rem',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
          }}
        >
          <span>➕</span> Thêm Người Dùng
        </button>
      </div>

      {/* Thông báo Alert */}
      {successMessage && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '0.85rem 1.25rem', borderRadius: '0.75rem', marginBottom: '1.5rem', fontWeight: 600 }}>
          ✓ {successMessage}
        </div>
      )}

      {message && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '0.85rem 1.25rem', borderRadius: '0.75rem', marginBottom: '1.5rem' }}>
          ⚠️ {message}
        </div>
      )}

      {/* Thống kê người dùng theo vai trò */}
      <UserStatsCards users={users} />

      {/* Bảng danh sách người dùng */}
      <UserTable
        users={users}
        currentUser={currentUser}
        onOpenEditModal={handleOpenEditModal}
        onDeactivate={handleDeactivate}
        onActivate={handleActivate}
      />

      {/* Modal Form Thêm / Sửa */}
      <UserFormModal
        isOpen={isModalOpen}
        isEditMode={isEditMode}
        formData={formData}
        setFormData={setFormData}
        modalError={modalError}
        isSubmitting={isSubmitting}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
};

export default UserManagement;
