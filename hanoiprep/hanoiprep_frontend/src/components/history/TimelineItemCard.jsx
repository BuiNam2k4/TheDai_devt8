import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getScoreColor } from './historyUtils';

const TimelineItemCard = ({ sub }) => {
  const navigate = useNavigate();

  const isGraded = sub.status === 'GRADED' && sub.totalScore != null;
  const score = sub.totalScore;
  const scoreColor = isGraded && score != null ? getScoreColor(score) : '#94a3b8';

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '0.75rem',
        padding: '1rem 1.25rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', flex: '1', minWidth: '260px' }}>
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '0.5rem',
            background: 'rgba(99, 102, 241, 0.15)',
            color: 'var(--primary-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            fontSize: '0.9rem',
            flexShrink: 0,
          }}
        >
          #{sub.id}
        </div>
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
            {sub.lesson?.title || 'Bài tập Toán học'}
          </h4>
          <div
            style={{
              display: 'flex',
              gap: '0.6rem',
              alignItems: 'center',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
            }}
          >
            <span>🏷️ {sub.lesson?.category || 'Toán'}</span>
            <span>•</span>
            <span>🕒 {sub.createdAt ? new Date(sub.createdAt).toLocaleString('vi-VN') : 'N/A'}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {isGraded ? (
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '1.3rem', fontWeight: '800', color: scoreColor }}>
              {score != null ? score.toFixed(1) : 'N/A'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '2px' }}>/ 10</span>
          </div>
        ) : (
          <span
            style={{
              fontSize: '0.8rem',
              color: '#f59e0b',
              fontWeight: '600',
              background: 'rgba(245, 158, 11, 0.15)',
              padding: '0.25rem 0.6rem',
              borderRadius: '1rem',
            }}
          >
            Đang chấm AI...
          </span>
        )}

        <button
          onClick={() => navigate(`/submission/${sub.id}/result`)}
          style={{
            background: isGraded ? 'var(--primary-color)' : 'rgba(255,255,255,0.08)',
            color: 'white',
            border: 'none',
            padding: '0.45rem 0.85rem',
            borderRadius: '0.4rem',
            fontWeight: '600',
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          🔍 Xem Bài Chấm
        </button>
      </div>
    </div>
  );
};

export default TimelineItemCard;
