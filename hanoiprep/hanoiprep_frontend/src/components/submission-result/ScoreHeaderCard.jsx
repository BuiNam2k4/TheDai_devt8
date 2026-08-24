import React from 'react';

const ScoreHeaderCard = ({ submission, displayScore, displayMax, scorePercent, scoreColor }) => {
  return (
    <div
      style={{
        background: 'var(--card-bg)',
        borderRadius: '1.5rem',
        padding: '2.5rem',
        textAlign: 'center',
        marginBottom: '1.5rem',
        border: '1px solid var(--border-color)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}
    >
      <p
        style={{
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: '0.5rem',
        }}
      >
        Kết quả chấm điểm AI • Bài #{submission.id}
      </p>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
        {submission.lesson?.title || 'Bài làm'}
      </h1>

      {/* Score circle */}
      <div
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: 'var(--bg-color)',
          borderRadius: '50%',
          width: '160px',
          height: '160px',
          justifyContent: 'center',
          border: `6px solid ${scoreColor}`,
          boxShadow: `0 0 0 4px ${scoreColor}22`,
          marginBottom: '1.5rem',
        }}
      >
        <span style={{ fontSize: '3rem', fontWeight: 900, color: scoreColor, lineHeight: 1 }}>
          {displayScore}
        </span>
        <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {displayMax}</span>
      </div>

      {/* Progress bar */}
      <div style={{ maxWidth: '360px', margin: '0 auto' }}>
        <div style={{ background: 'var(--border-color)', borderRadius: '99px', height: '10px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${Math.min(scorePercent, 100)}%`,
              height: '100%',
              background: scoreColor,
              borderRadius: '99px',
              transition: 'width 1s ease',
            }}
          />
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          {scorePercent.toFixed(1)}% điểm đạt được
        </p>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
        Nộp lúc {new Date(submission.createdAt).toLocaleString('vi-VN')}
      </p>
    </div>
  );
};

export default ScoreHeaderCard;
