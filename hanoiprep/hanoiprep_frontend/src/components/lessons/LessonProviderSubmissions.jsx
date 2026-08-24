import React from 'react';
import { useNavigate } from 'react-router-dom';

const LessonProviderSubmissions = ({ submissions, lessonFeedbacks }) => {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Danh sách học sinh nộp bài */}
      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '1rem',
          padding: '1.5rem',
          backdropFilter: 'blur(10px)',
        }}
      >
        <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>📋</span> Danh Sách Bài Nộp Của Học Viên ({submissions.length})
        </h3>

        {submissions.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
            Chưa có học viên nào nộp bài cho bài học này.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {submissions.map((sub) => (
              <div
                key={sub.id}
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.6rem',
                  padding: '0.85rem 1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <span style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.95rem' }}>
                    👤 {sub.user?.username || 'Học viên #' + sub.userId}
                  </span>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    🕒 Nộp lúc: {sub.createdAt ? new Date(sub.createdAt).toLocaleString('vi-VN') : 'N/A'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {sub.status === 'GRADED' ? (
                    <span style={{ fontWeight: '800', color: '#10b981', fontSize: '1.1rem' }}>
                      {sub.totalScore != null ? sub.totalScore.toFixed(1) : 'N/A'} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ 10</span>
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: '600' }}>
                      Đang chấm AI...
                    </span>
                  )}

                  <button
                    onClick={() => navigate(`/submission/${sub.id}/result`)}
                    style={{
                      background: 'rgba(99, 102, 241, 0.15)',
                      color: 'var(--primary-color)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      padding: '0.4rem 0.85rem',
                      borderRadius: '0.4rem',
                      fontWeight: '600',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    🔍 Xem kết quả
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Phản hồi của học viên về bài này */}
      {lessonFeedbacks.length > 0 && (
        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '1rem',
            padding: '1.5rem',
            backdropFilter: 'blur(10px)',
          }}
        >
          <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>💬</span> Phản Hồi / Báo Lỗi ({lessonFeedbacks.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {lessonFeedbacks.map((fb) => (
              <div
                key={fb.id}
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.6rem',
                  padding: '0.85rem 1.25rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.85rem' }}>
                    👤 {fb.user?.username || 'Học viên'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {fb.createdAt ? new Date(fb.createdAt).toLocaleString('vi-VN') : ''}
                  </span>
                </div>
                <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
                  {fb.comment}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonProviderSubmissions;
