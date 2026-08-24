import React from 'react';

const UserStatsCards = ({ users }) => {
  const total = users.length;
  const adminCount = users.filter((u) => u.role === 'ROLE_ADMIN').length;
  const providerCount = users.filter((u) => u.role === 'ROLE_COURSE_PROVIDER').length;
  const learnerCount = users.filter((u) => u.role === 'ROLE_LEARNER').length;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem',
      }}
    >
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem', borderLeft: '4px solid #6366f1' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
          Tổng Người Dùng
        </span>
        <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', margin: '0.35rem 0 0' }}>
          {total}
        </h3>
      </div>

      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
          Học Viên (Learner)
        </span>
        <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', margin: '0.35rem 0 0' }}>
          {learnerCount}
        </h3>
      </div>

      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
          Giáo Viên (Provider)
        </span>
        <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b', margin: '0.35rem 0 0' }}>
          {providerCount}
        </h3>
      </div>

      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
          Quản Trị Viên (Admin)
        </span>
        <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444', margin: '0.35rem 0 0' }}>
          {adminCount}
        </h3>
      </div>
    </div>
  );
};

export default UserStatsCards;
