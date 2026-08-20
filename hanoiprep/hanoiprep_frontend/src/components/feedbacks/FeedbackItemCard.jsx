import React from 'react';
import { Link } from 'react-router-dom';

const FeedbackItemCard = ({ fb }) => {
  return (
    <div
      style={{
        background: 'var(--card-bg)',
        borderRadius: '1.25rem',
        padding: '1.5rem 1.75rem',
        border: '1px solid var(--border-color)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        borderLeft: '5px solid #6366f1',
      }}
    >
      {/* Header dòng đầu: Tên học viên, bài học và ngày */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              👤 {fb.user?.username || 'Học viên ẩn danh'}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              ({fb.user?.gmail || 'Không có email'})
            </span>
          </div>

          <div style={{ marginTop: '0.35rem' }}>
            <span
              style={{
                fontSize: '0.85rem',
                background: 'rgba(99, 102, 241, 0.12)',
                color: '#818cf8',
                padding: '3px 10px',
                borderRadius: '6px',
                fontWeight: 600,
              }}
            >
              📖 Bài: {fb.lesson?.title || 'Bài học #' + fb.lessonId}
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            🕒 {fb.createdAt ? new Date(fb.createdAt).toLocaleString('vi-VN') : 'N/A'}
          </span>
          {fb.submission && (
            <div style={{ marginTop: '0.25rem' }}>
              <Link
                to={`/submission/${fb.submission.id}/result`}
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--primary-color)',
                  fontWeight: 600,
                  textDecoration: 'underline',
                }}
              >
                🔍 Xem bài nộp #{fb.submission.id}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Nội dung phản hồi */}
      <div
        style={{
          background: 'var(--input-bg)',
          padding: '1rem 1.25rem',
          borderRadius: '0.75rem',
          color: 'var(--text-primary)',
          fontSize: '0.95rem',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          border: '1px solid var(--border-color)',
        }}
      >
        {fb.comment}
      </div>
    </div>
  );
};

export default FeedbackItemCard;
