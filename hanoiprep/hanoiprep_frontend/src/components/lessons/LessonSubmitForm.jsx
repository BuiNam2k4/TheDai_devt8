import React from 'react';

const LessonSubmitForm = ({
  selectedLesson,
  answerText,
  setAnswerText,
  isSubmitting,
  onSubmitAssignment,
}) => {
  if (!selectedLesson) return null;

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '1rem',
        padding: '1.5rem',
        backdropFilter: 'blur(10px)',
      }}
    >
      <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>✍️</span> Nộp Bài Làm Của Bạn
      </h3>

      <form onSubmit={onSubmitAssignment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            Nhập lời giải trực tiếp (Tùy chọn):
          </label>
          <textarea
            rows="4"
            placeholder="Nhập các bước giải toán học của bạn tại đây..."
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border-color)',
              background: 'var(--input-bg)',
              color: 'var(--text-main)',
              fontSize: '0.9rem',
              resize: 'vertical',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            Tải lên file bài làm (Ảnh chụp hoặc PDF chữ viết tay):
          </label>
          <input
            type="file"
            id="assignmentFileInput"
            accept="image/*,application/pdf"
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border-color)',
              background: 'var(--input-bg)',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            background: 'var(--primary-color)',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.5rem',
            fontWeight: '700',
            fontSize: '0.95rem',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            marginTop: '0.5rem',
          }}
        >
          {isSubmitting ? '⏳ Đang nộp bài và chấm AI...' : '🚀 Nộp Bài & Nhận Đánh Giá AI'}
        </button>
      </form>
    </div>
  );
};

export default LessonSubmitForm;
