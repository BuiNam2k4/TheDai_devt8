import React from 'react';
import { getScoreColor } from './historyUtils';

const HistoryKpis = ({
  totalLessonsParticipated,
  totalSubmissionsCount,
  overallAverageScore,
  allGradedCount,
  excellentLessonsCount,
  overallMaxScore,
}) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem',
      }}
    >
      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '0.75rem',
          padding: '1.25rem',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '500' }}>
            BÀI HỌC ĐÃ THAM GIA
          </span>
          <span style={{ fontSize: '1.4rem' }}>📚</span>
        </div>
        <div style={{ fontSize: '1.85rem', fontWeight: '700', color: 'var(--text-main)', marginTop: '0.5rem' }}>
          {totalLessonsParticipated} <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: '400' }}>bài học</span>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
          Tổng cộng {totalSubmissionsCount} lượt nộp bài
        </div>
      </div>

      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '0.75rem',
          padding: '1.25rem',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '500' }}>
            ĐIỂM TRUNG BÌNH (GPA)
          </span>
          <span style={{ fontSize: '1.4rem' }}>🎯</span>
        </div>
        <div
          style={{
            fontSize: '1.85rem',
            fontWeight: '700',
            color: getScoreColor(parseFloat(overallAverageScore)),
            marginTop: '0.5rem',
          }}
        >
          {overallAverageScore} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 10</span>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
          Tính trên {allGradedCount} bài đã chấm
        </div>
      </div>

      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '0.75rem',
          padding: '1.25rem',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '500' }}>
            BÀI ĐẠT LOẠI GIỎI (≥ 8.0)
          </span>
          <span style={{ fontSize: '1.4rem' }}>⭐</span>
        </div>
        <div style={{ fontSize: '1.85rem', fontWeight: '700', color: '#10b981', marginTop: '0.5rem' }}>
          {excellentLessonsCount}{' '}
          <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: '400' }}>
            / {totalLessonsParticipated} bài
          </span>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
          {totalLessonsParticipated > 0
            ? Math.round((excellentLessonsCount / totalLessonsParticipated) * 100)
            : 0}
          % bài học đạt chuẩn
        </div>
      </div>

      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '0.75rem',
          padding: '1.25rem',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '500' }}>
            ĐIỂM CAO NHẤT ĐẠT ĐƯỢC
          </span>
          <span style={{ fontSize: '1.4rem' }}>🏆</span>
        </div>
        <div style={{ fontSize: '1.85rem', fontWeight: '700', color: '#818cf8', marginTop: '0.5rem' }}>
          {overallMaxScore} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 10</span>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
          Kỷ lục điểm số cao nhất của bạn
        </div>
      </div>
    </div>
  );
};

export default HistoryKpis;
