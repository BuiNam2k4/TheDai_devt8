import React from 'react';

const UserTable = ({ users, currentUser, onOpenEditModal, onDeactivate, onActivate }) => {
  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'ROLE_ADMIN':
        return { background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' };
      case 'ROLE_COURSE_PROVIDER':
        return { background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' };
      case 'ROLE_LEARNER':
      default:
        return { background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' };
    }
  };

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '1rem',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '650px' }}>
          <thead>
            <tr style={{ background: 'rgba(15, 23, 42, 0.6)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>ID</th>
              <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tên Đăng Nhập</th>
              <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Email</th>
              <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Vai Trò</th>
              <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Trạng Thái</th>
              <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Không tìm thấy người dùng nào.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const roleBadge = getRoleBadgeStyle(u.role);

                return (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background 0.2s',
                    }}
                  >
                    <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>#{u.id}</td>
                    <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {u.username} {isSelf && <span style={{ fontSize: '0.75rem', color: 'var(--primary-color)' }}>(Bạn)</span>}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{u.gmail || 'N/A'}</td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '99px', fontWeight: 700, ...roleBadge }}>
                        {u.role ? u.role.replace('ROLE_', '') : 'USER'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '99px',
                          fontWeight: 600,
                          background: u.active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: u.active ? '#34d399' : '#f87171',
                        }}
                      >
                        {u.active ? '● Đang hoạt động' : '○ Đã khóa'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => onOpenEditModal(u)}
                          style={{
                            background: 'rgba(99, 102, 241, 0.15)',
                            color: 'var(--primary-color)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '0.4rem',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          ✏️ Sửa
                        </button>

                        {!isSelf && (
                          u.active ? (
                            <button
                              onClick={() => onDeactivate(u.id)}
                              style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                color: '#f87171',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                padding: '0.35rem 0.75rem',
                                borderRadius: '0.4rem',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              🔒 Khóa
                            </button>
                          ) : (
                            <button
                              onClick={() => onActivate(u.id)}
                              style={{
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#34d399',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                padding: '0.35rem 0.75rem',
                                borderRadius: '0.4rem',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              🔓 Mở khóa
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserTable;
