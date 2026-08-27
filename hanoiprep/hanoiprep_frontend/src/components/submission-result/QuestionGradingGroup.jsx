import React from 'react';

const getScoreColor = (pct) => {
  if (pct >= 80) return '#22c55e';
  if (pct >= 60) return '#f59e0b';
  return '#ef4444';
};

const formatScore = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '0';
  const val = Number(num);
  return Number.isInteger(val) ? val.toString() : val.toFixed(2).replace(/\.?0+$/, '');
};

const QuestionGradingGroup = ({
  groupedDetails,
  overallScorePercent,
  isEditingGrades = false,
  editedScores = {},
  editedFeedbacks = {},
  onScoreChange = () => {},
  onFeedbackChange = () => {},
}) => {
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          🤖 Kết quả đánh giá chi tiết theo từng Bài / Câu
        </h2>
        {isEditingGrades && (
          <span
            style={{
              background: '#fef3c7',
              color: '#92400e',
              border: '1px solid #fcd34d',
              padding: '4px 12px',
              borderRadius: '99px',
              fontSize: '0.85rem',
              fontWeight: 700,
            }}
          >
            ✏️ Chế độ Giáo viên chỉnh sửa
          </span>
        )}
      </div>

      {Object.entries(groupedDetails).map(([qNo, qDetails], qIndex) => {
        const qMaxScore = qDetails.reduce((sum, d) => sum + (d.rubric?.maxScore || 0), 0);
        const qAwarded = qDetails.reduce((sum, d) => {
          const currentScore = isEditingGrades && editedScores[d.id] !== undefined
            ? parseFloat(editedScores[d.id]) || 0
            : (d.awardedScore || 0);
          return sum + currentScore;
        }, 0);
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
                Đạt {formatScore(qAwarded)} / {qMaxScore > 0 ? formatScore(qMaxScore) : '?'} điểm
              </span>
            </div>

            {/* Danh sách các bước trong Bài/Câu */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {qDetails.map((detail, stepIdx) => {
                const currentScore = isEditingGrades && editedScores[detail.id] !== undefined
                  ? parseFloat(editedScores[detail.id]) || 0
                  : (detail.awardedScore || 0);

                const currentFeedback = isEditingGrades && editedFeedbacks[detail.id] !== undefined
                  ? editedFeedbacks[detail.id]
                  : (detail.aiFeedback || '');

                const detailPercent = detail.rubric
                  ? (currentScore / detail.rubric.maxScore) * 100
                  : overallScorePercent;
                const detailColor = getScoreColor(detailPercent);

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
                      <div style={{ flex: '1 1 300px' }}>
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
                          padding: isEditingGrades ? '0.35rem 0.6rem' : '0.25rem 0.6rem',
                          textAlign: 'center',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        {isEditingGrades ? (
                          <>
                            <input
                              type="number"
                              step="0.25"
                              min="0"
                              max={detail.rubric?.maxScore || 10}
                              value={editedScores[detail.id] !== undefined ? editedScores[detail.id] : (detail.awardedScore ?? 0)}
                              onChange={(e) => onScoreChange(detail.id, e.target.value)}
                              style={{
                                width: '70px',
                                padding: '0.3rem 0.4rem',
                                borderRadius: '0.4rem',
                                border: (currentScore > (detail.rubric?.maxScore || 10) || currentScore < 0)
                                  ? '2px solid #ef4444'
                                  : '1px solid var(--primary-color)',
                                fontWeight: 800,
                                fontSize: '1rem',
                                color: (currentScore > (detail.rubric?.maxScore || 10) || currentScore < 0)
                                  ? '#ef4444'
                                  : detailColor,
                                textAlign: 'center',
                                background: (currentScore > (detail.rubric?.maxScore || 10) || currentScore < 0)
                                  ? '#fee2e2'
                                  : 'var(--card-bg)',
                              }}
                            />
                            {detail.rubric && (
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                /{detail.rubric.maxScore}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: detailColor }}>
                              {formatScore(detail.awardedScore)}
                            </span>
                            {detail.rubric && (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                /{formatScore(detail.rubric.maxScore)}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {isEditingGrades && detail.rubric && (currentScore > detail.rubric.maxScore || currentScore < 0) && (
                      <div
                        style={{
                          background: '#fee2e2',
                          color: '#dc2626',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          marginBottom: '0.75rem',
                          display: 'inline-block',
                        }}
                      >
                        ⚠️ Điểm không hợp lệ: Điểm cho bước này phải nằm trong khoảng từ 0 đến {detail.rubric.maxScore} điểm!
                      </div>
                    )}

                    {isEditingGrades ? (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                          💬 Nhận xét / Đánh giá của Giáo viên cho bước này:
                        </label>
                        <textarea
                          rows={3}
                          value={currentFeedback}
                          onChange={(e) => onFeedbackChange(detail.id, e.target.value)}
                          placeholder="Nhập nhận xét hoặc chỉnh sửa phản hồi..."
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-color)',
                            color: 'var(--text-primary)',
                            fontSize: '0.9rem',
                            lineHeight: 1.5,
                            fontFamily: 'inherit',
                            resize: 'vertical',
                          }}
                        />
                      </div>
                    ) : (
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
                        {detail.aiFeedback || 'Đã hoàn thành tiêu chí.'}
                      </div>
                    )}
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

