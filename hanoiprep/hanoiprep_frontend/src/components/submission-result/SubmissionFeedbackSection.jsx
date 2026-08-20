import React from 'react';

const SubmissionFeedbackSection = ({
  currentUser,
  existingFeedback,
  submission,
  isFeedbackOpen,
  setIsFeedbackOpen,
  feedbackComment,
  setFeedbackComment,
  isSubmittingFeedback,
  feedbackSuccessMsg,
  feedbackErrorMsg,
  handleSendFeedback,
}) => {
  if (currentUser?.role === 'ROLE_COURSE_PROVIDER') {
    if (!existingFeedback) return null;
    return (
      <div
        style={{
          marginTop: '2rem',
          background: 'var(--card-bg)',
          borderRadius: '1.25rem',
          padding: '1.5rem 2rem',
          border: '1px solid var(--border-color)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
          borderLeft: '5px solid #6366f1',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <h3
            style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            💬 Phản hồi / Báo lỗi từ học viên ({existingFeedback.user?.username || submission?.user?.username || 'Học viên'})
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {existingFeedback.createdAt ? new Date(existingFeedback.createdAt).toLocaleString('vi-VN') : ''}
          </span>
        </div>
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
          {existingFeedback.comment}
        </div>
      </div>
    );
  }

  // Learner Feedback Form
  return (
    <div
      style={{
        marginTop: '2rem',
        background: 'var(--card-bg)',
        borderRadius: '1.25rem',
        border: '1px solid var(--border-color)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        overflow: 'hidden',
      }}
    >
      {/* Header đóng/mở */}
      <div
        onClick={() => setIsFeedbackOpen(!isFeedbackOpen)}
        style={{
          padding: '1.25rem 1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          background: isFeedbackOpen ? 'var(--input-bg)' : 'transparent',
          borderBottom: isFeedbackOpen ? '1px solid var(--border-color)' : 'none',
          transition: 'background 0.2s',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '1.2rem' }}>⚠️</span>
          <div>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
              Báo lỗi đề bài hoặc gửi góp ý cho giáo viên
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.5rem', fontWeight: 500 }}>
              (Không bắt buộc - chỉ gửi khi phát hiện sai sót)
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {existingFeedback && (
            <span
              style={{
                fontSize: '0.75rem',
                background: '#dcfce7',
                color: '#15803d',
                padding: '3px 10px',
                borderRadius: '99px',
                fontWeight: 600,
                border: '1px solid #86efac',
              }}
            >
              ✓ Đã gửi phản hồi
            </span>
          )}
          <span
            style={{
              fontSize: '0.85rem',
              color: 'var(--primary-color)',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            {isFeedbackOpen ? '▲ Thu gọn' : '▼ Nhập phản hồi'}
          </span>
        </div>
      </div>

      {/* Nội dung form khi mở */}
      {isFeedbackOpen && (
        <div style={{ padding: '1.75rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            Nếu bạn nhận thấy đề bài bị lỗi, đáp án/rubric chưa chính xác hoặc có vấn đề cần thông báo cho giáo viên, hãy nhập mô tả bên dưới:
          </p>

          {feedbackSuccessMsg && (
            <div
              style={{
                background: '#dcfce7',
                border: '1px solid #86efac',
                color: '#15803d',
                padding: '0.75rem 1.25rem',
                borderRadius: '0.75rem',
                marginBottom: '1.25rem',
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            >
              {feedbackSuccessMsg}
            </div>
          )}

          {feedbackErrorMsg && (
            <div
              style={{
                background: '#fee2e2',
                border: '1px solid #fca5a5',
                color: '#dc2626',
                padding: '0.75rem 1.25rem',
                borderRadius: '0.75rem',
                marginBottom: '1.25rem',
                fontSize: '0.9rem',
              }}
            >
              ⚠️ {feedbackErrorMsg}
            </div>
          )}

          <form onSubmit={handleSendFeedback}>
            <div style={{ marginBottom: '1rem' }}>
              <textarea
                className="form-control"
                rows="3"
                placeholder="Mô tả lỗi hoặc góp ý về bài học này (ví dụ: Câu 2 đề bài thiếu dữ kiện, công thức bị lỗi hiển thị...)"
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--border-color)',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  resize: 'vertical',
                }}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setIsFeedbackOpen(false)}
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '0.6rem',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                }}
              >
                Đóng lại
              </button>
              <button
                type="submit"
                disabled={isSubmittingFeedback || !feedbackComment.trim()}
                style={{
                  background: 'var(--primary-color)',
                  color: 'white',
                  border: 'none',
                  padding: '0.6rem 1.5rem',
                  borderRadius: '0.6rem',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: isSubmittingFeedback || !feedbackComment.trim() ? 'not-allowed' : 'pointer',
                  opacity: isSubmittingFeedback || !feedbackComment.trim() ? 0.6 : 1,
                  transition: 'all 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                {isSubmittingFeedback
                  ? '⏳ Đang gửi...'
                  : existingFeedback
                  ? '💾 Cập nhật phản hồi'
                  : '📤 Gửi phản hồi báo lỗi'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default SubmissionFeedbackSection;
