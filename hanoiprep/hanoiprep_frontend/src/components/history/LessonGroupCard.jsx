import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getScoreColor, getEvaluationBadge } from './historyUtils';
import PaginationBar from './PaginationBar';

const LessonGroupCard = ({ group, isExpanded, onToggleExpand, statusFilter }) => {
  const navigate = useNavigate();
  const [innerPage, setInnerPage] = useState(1);

  const badge = getEvaluationBadge(group.bestScore);
  const bestScoreColor = getScoreColor(group.bestScore);

  // Lọc các lần nộp hiển thị theo đúng bộ lọc
  const visibleSubmissions = group.submissions.filter((s) => {
    const isSubGraded = s.status === 'GRADED' && s.totalScore != null;
    if (statusFilter === 'GRADED') return isSubGraded;
    if (statusFilter === 'PENDING') return !isSubGraded;
    return true;
  });

  const latestGradedSub = group.submissions.find((s) => s.status === 'GRADED' && s.totalScore != null);
  const displayLatestScore = statusFilter === 'GRADED' ? latestGradedSub?.totalScore : group.latestScore;
  const displayLatestScoreColor = getScoreColor(displayLatestScore);

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '0.85rem',
        overflow: 'hidden',
        backdropFilter: 'blur(10px)',
        transition: 'border-color 0.2s',
      }}
    >
      {/* Lesson Header Card */}
      <div
        style={{
          padding: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Left: Info */}
        <div style={{ flex: '1', minWidth: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span
              style={{
                fontSize: '0.75rem',
                background: badge.bg,
                color: badge.color,
                padding: '0.2rem 0.6rem',
                borderRadius: '1rem',
                fontWeight: '700',
              }}
            >
              {badge.text}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              🏷️ {group.lesson?.category || 'Toán học'}
            </span>
          </div>

          <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.4rem' }}>
            {group.lesson?.title || 'Bài tập Toán'}
          </h3>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <span>
              📝 <strong>{visibleSubmissions.length}</strong>{' '}
              {statusFilter === 'GRADED'
                ? 'lần đã có điểm'
                : statusFilter === 'PENDING'
                ? 'lần đang chấm'
                : 'lần làm bài'}
            </span>
            <span>•</span>
            <span>
              🕒 Lần nộp gần nhất:{' '}
              {group.latestSubmissionDate
                ? new Date(group.latestSubmissionDate).toLocaleString('vi-VN')
                : 'N/A'}
            </span>
          </div>
        </div>

        {/* Middle: Score Summary Stats */}
        <div
          style={{
            display: 'flex',
            gap: '1.5rem',
            alignItems: 'center',
            background: 'var(--input-bg)',
            padding: '0.75rem 1.25rem',
            borderRadius: '0.6rem',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>ĐIỂM CAO NHẤT</div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', color: bestScoreColor, marginTop: '2px' }}>
              {group.bestScore != null ? group.bestScore.toFixed(1) : '--'}
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '400' }}>/10</span>
            </div>
          </div>

          <div style={{ width: '1px', height: '30px', background: 'var(--border-color)' }} />

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>LẦN GẦN NHẤT</div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', color: displayLatestScoreColor, marginTop: '2px' }}>
              {displayLatestScore != null
                ? displayLatestScore.toFixed(1)
                : statusFilter === 'PENDING' || group.pendingCount > 0
                ? 'Đang chấm'
                : '--'}
            </div>
          </div>

          {group.averageScore != null && (
            <>
              <div style={{ width: '1px', height: '30px', background: 'var(--border-color)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>TRUNG BÌNH</div>
                <div
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: '800',
                    color: getScoreColor(group.averageScore),
                    marginTop: '2px',
                  }}
                >
                  {group.averageScore.toFixed(1)}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={() => onToggleExpand(group.lessonId)}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              padding: '0.55rem 0.9rem',
              borderRadius: '0.5rem',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span>{isExpanded ? '▲ Thu gọn' : `▼ Xem ${visibleSubmissions.length} lần nộp`}</span>
          </button>

          <Link
            to="/learner/lessons"
            style={{
              background: 'var(--primary-color)',
              color: 'white',
              padding: '0.55rem 0.9rem',
              borderRadius: '0.5rem',
              fontSize: '0.85rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <span>🔄</span> Làm lại
          </Link>
        </div>
      </div>

      {/* Expanded Accordion: Submissions List for this specific lesson */}
      {isExpanded && (
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.4)',
            borderTop: '1px solid var(--border-color)',
            padding: '1rem 1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h4
              style={{
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              📋 Lịch sử các lần nộp của bài học này ({visibleSubmissions.length} lần nộp):
            </h4>
          </div>

          {visibleSubmissions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', margin: 0 }}>
              Không có lần nộp nào khớp với bộ lọc.
            </p>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {visibleSubmissions
                  .slice((innerPage - 1) * 5, innerPage * 5)
                  .map((sub, idx) => {
                    const isGraded = sub.status === 'GRADED' && sub.totalScore != null;
                    const score = sub.totalScore;
                    const scoreColor = isGraded && score != null ? getScoreColor(score) : '#94a3b8';
                    const attemptNo = visibleSubmissions.length - ((innerPage - 1) * 5 + idx);

                    return (
                      <div
                        key={sub.id}
                        style={{
                          background: 'var(--card-bg)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '0.5rem',
                          padding: '0.75rem 1rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '0.75rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span
                            style={{
                              background: 'rgba(99, 102, 241, 0.15)',
                              color: 'var(--primary-color)',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '0.35rem',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                            }}
                          >
                            Lần {attemptNo}
                          </span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                            🕒 {sub.createdAt ? new Date(sub.createdAt).toLocaleString('vi-VN') : 'N/A'}
                          </span>
                          {sub.answerFileUrl && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📎 Có đính kèm file</span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          {isGraded ? (
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                              <span style={{ fontSize: '1.15rem', fontWeight: '800', color: scoreColor }}>
                                {score != null ? score.toFixed(1) : 'N/A'}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ 10</span>
                            </div>
                          ) : sub.status === 'GRADING_FAILED' || sub.status === 'FAILED' ? (
                            <span style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: '600' }}>⚠️ Lỗi chấm điểm</span>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: '600' }}>⏳ Đang chấm AI...</span>
                          )}

                          <button
                            onClick={() => navigate(`/submission/${sub.id}/result`)}
                            style={{
                              background: isGraded ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.06)',
                              color: isGraded ? '#818cf8' : 'var(--text-muted)',
                              border: '1px solid rgba(99, 102, 241, 0.3)',
                              padding: '0.35rem 0.75rem',
                              borderRadius: '0.4rem',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                            }}
                          >
                            {isGraded ? '🔍 Xem Chi Tiết Barem' : 'Xem Tiến Trình'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Phân trang 5 lần nộp / trang */}
              {Math.ceil(visibleSubmissions.length / 5) > 1 && (
                <div style={{ marginTop: '0.75rem' }}>
                  <PaginationBar
                    currentPage={innerPage}
                    setCurrentPage={setInnerPage}
                    totalCurrentPages={Math.ceil(visibleSubmissions.length / 5)}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default LessonGroupCard;
