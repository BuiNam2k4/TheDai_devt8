import React from 'react';

const FeedbackStatsCards = ({ totalFeedbacks, uniqueLessonsCount, latestFeedbackDate }) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem',
      }}
    >
      <div
        style={{
          background: 'var(--card-bg)',
          borderRadius: '1rem',
          padding: '1.5rem',
          border: '1px solid var(--border-color)',
          borderLeft: '5px solid #6366f1',
        }}
      >
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
          Tổng số phản hồi
        </p>
        <p style={{ fontSize: '2rem', fontWeight: 800, color: '#6366f1', margin: '0.5rem 0 0' }}>
          {totalFeedbacks}
        </p>
      </div>

      <div
        style={{
          background: 'var(--card-bg)',
          borderRadius: '1rem',
          padding: '1.5rem',
          border: '1px solid var(--border-color)',
          borderLeft: '5px solid #22c55e',
        }}
      >
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
          Bài học có phản hồi
        </p>
        <p style={{ fontSize: '2rem', fontWeight: 800, color: '#22c55e', margin: '0.5rem 0 0' }}>
          {uniqueLessonsCount}
        </p>
      </div>

      <div
        style={{
          background: 'var(--card-bg)',
          borderRadius: '1rem',
          padding: '1.5rem',
          border: '1px solid var(--border-color)',
          borderLeft: '5px solid #f59e0b',
        }}
      >
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
          Phản hồi mới nhất
        </p>
        <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.75rem 0 0' }}>
          {latestFeedbackDate ? new Date(latestFeedbackDate).toLocaleDateString('vi-VN') : 'Chưa có'}
        </p>
      </div>
    </div>
  );
};

export default FeedbackStatsCards;
