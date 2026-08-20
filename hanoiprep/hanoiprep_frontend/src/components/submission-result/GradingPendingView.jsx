import React from 'react';

const GradingPendingView = () => {
  return (
    <div
      style={{
        maxWidth: '650px',
        margin: '4rem auto',
        padding: '3rem 2rem',
        background: 'var(--card-bg)',
        borderRadius: '1.5rem',
        border: '1px solid var(--border-color)',
        textAlign: 'center',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          margin: '0 auto 1.5rem',
          border: '5px solid var(--border-color)',
          borderTop: '5px solid #6366f1',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
        🤖 Hệ thống đang chấm bài...
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        Bài làm của bạn đang được phân tích và đánh giá chi tiết theo từng câu hỏi. Trang sẽ tự động hiển thị kết quả ngay khi hoàn tất!
      </p>
      <span
        style={{
          fontSize: '0.8rem',
          background: '#e0e7ff',
          color: '#3730a3',
          padding: '6px 16px',
          borderRadius: '99px',
          fontWeight: 600,
        }}
      >
        ⚡ Đang xử lý tự động
      </span>
    </div>
  );
};

export default GradingPendingView;
