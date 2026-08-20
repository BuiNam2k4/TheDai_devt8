import React from 'react';

const UserFormModal = ({
  isOpen,
  isEditMode,
  formData,
  setFormData,
  modalError,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: '#1e293b',
          border: '1px solid var(--border-color)',
          borderRadius: '1rem',
          maxWidth: '480px',
          width: '100%',
          padding: '2rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            {isEditMode ? '✏️ Cập Nhật Người Dùng' : '➕ Thêm Người Dùng Mới'}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '1.4rem',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {modalError && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '0.65rem 1rem',
              borderRadius: '0.5rem',
              fontSize: '0.85rem',
              marginBottom: '1rem',
            }}
          >
            ⚠️ {modalError}
          </div>
        )}

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Tên đăng nhập (Username):
            </label>
            <input
              type="text"
              required
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border-color)',
                background: 'var(--input-bg)',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Địa chỉ Gmail:
            </label>
            <input
              type="email"
              required
              value={formData.gmail}
              onChange={(e) => setFormData({ ...formData, gmail: e.target.value })}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border-color)',
                background: 'var(--input-bg)',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              {isEditMode ? 'Mật khẩu mới (Để trống nếu không đổi):' : 'Mật khẩu:'}
            </label>
            <input
              type="password"
              required={!isEditMode}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border-color)',
                background: 'var(--input-bg)',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Vai trò (Role):
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border-color)',
                background: 'var(--input-bg)',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              <option value="ROLE_LEARNER">Học viên (Learner)</option>
              <option value="ROLE_COURSE_PROVIDER">Giáo viên / Tạo bài (Course Provider)</option>
              <option value="ROLE_ADMIN">Quản trị viên (Admin)</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'var(--input-bg)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
                padding: '0.6rem 1.25rem',
                borderRadius: '0.5rem',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                background: 'var(--primary-color)',
                color: 'white',
                border: 'none',
                padding: '0.6rem 1.5rem',
                borderRadius: '0.5rem',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              {isSubmitting ? 'Đang lưu...' : isEditMode ? 'Lưu Thay Đổi' : 'Tạo Người Dùng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;
