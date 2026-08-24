import React from 'react';

const getScoreColor = (pct) => {
  if (pct >= 80) return '#22c55e';
  if (pct >= 60) return '#f59e0b';
  return '#ef4444';
};

const QuestionGradingGroup = ({ groupedDetails, overallScorePercent }) => {
  if (Object.keys(groupedDetails).length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🤖 Kết quả đánh giá chi tiết theo từng Bài / Câu
        </h2>
        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa có nhận xét nào.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        🤖 Kết quả đánh giá chi tiết theo từng Bài / Câu
      </h2>

      {Object.entries(groupedDetails).map(([qNo, qDetails], qIndex) => {
        const qMaxScore = qDetails.reduce((sum, d) => sum + (d.rubric?.maxScore || 0), 0);
        const qAwarded = qDetails.reduce((sum, d) => sum + (d.awardedScore || 0), 0);
        const qPercent = qMaxScore > 0 ? (qAwarded / qMaxScore) * 100 : 100;
        const qColor = getScoreColor(qPercent);

        return (
          <div
            key={qNo || qIndex}
            style={{
              background: 'var(--card-bg)',
              borderRadius: '1.25rem',
              padding: '1.75rem',
              border: '1px solid var(--border-color)',
              boxShadow: '0 4px 18px rgba(0,0,0,0.05)',
            }}
          >
            {/* Header Bài/Câu */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '0.75rem',
              }}
            >
              <h3
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: '#4f46e5',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                📌 {qNo}
              </h3>
              <span
                style={{
                  background: `${qColor}15`,
                  color: qColor,
                  fontWeight: 700,
                  padding: '4px 12px',
                  borderRadius: '99px',
                  fontSize: '0.9rem',
                  border: `1px solid ${qColor}44`,
                }}
              >
                Đạt {qAwarded.toFixed(1)} / {qMaxScore > 0 ? qMaxScore.toFixed(1) : '?'} điểm
              </span>
            </div>

            {/* Danh sách các bước trong Bài/Câu */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {qDetails.map((detail, stepIdx) => {
                const detailPercent = detail.rubric
                  ? (detail.awardedScore / detail.rubric.maxScore) * 100
                  : overallScorePercent;
                const detailColor = getScoreColor(detailPercent);
                const feedbackText = detail.aiFeedback || '';

                return (
                  <div
                    key={detail.id || stepIdx}
                    style={{
                      background: 'var(--input-bg)',
                      borderRadius: '0.85rem',
                      padding: '1.25rem',
                      border: '1px solid var(--border-color)',
                      borderLeft: `4px solid ${detailColor}`,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '0.75rem',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                      }}
                    >
                      <div>
                        <h4
                          style={{
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            marginBottom: '0.2rem',
                          }}
                        >
                          Bước {detail.rubric?.stepOrder || stepIdx + 1}:{' '}
                          {detail.rubric?.stepDescription || 'Tiêu chí'}
                        </h4>
                        {detail.rubric?.expectedLogicKeyword && (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              background: 'var(--border-color)',
                              color: 'var(--text-muted)',
                              padding: '2px 8px',
                              borderRadius: '99px',
                            }}
                          >
                            🔑 Từ khóa: {detail.rubric.expectedLogicKeyword}
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          background: 'var(--bg-color)',
                          border: `1px solid ${detailColor}`,
                          borderRadius: '0.5rem',
                          padding: '0.25rem 0.6rem',
                          textAlign: 'center',
                        }}
                      >
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: detailColor }}>
                          {detail.awardedScore?.toFixed(1)}
                        </span>
                        {detail.rubric && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            /{detail.rubric.maxScore}
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        background: 'var(--bg-color)',
                        borderRadius: '0.5rem',
                        padding: '0.85rem',
                        fontSize: '0.88rem',
                        color: 'var(--text-primary)',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {feedbackText}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default QuestionGradingGroup;
