import React from 'react';

const LessonDetailCard = ({
  selectedLesson,
  currentUser,
  selectedPdfUrl,
  setSelectedPdfUrl,
}) => {
  if (!selectedLesson) return null;

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '1rem',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <span style={{ fontSize: '0.8rem', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary-color)', padding: '3px 10px', borderRadius: '99px', fontWeight: '700' }}>
            🏷️ {selectedLesson.category || 'Toán học'}
          </span>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-main)', marginTop: '0.5rem', marginBottom: '0.25rem' }}>
            {selectedLesson.title}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            {selectedLesson.description || 'Không có mô tả chi tiết.'}
          </p>
        </div>
      </div>

      {/* Buttons mở tài liệu PDF */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
        {selectedLesson.questionFileUrl && (
          <button
            onClick={() => setSelectedPdfUrl(selectedPdfUrl === selectedLesson.questionFileUrl ? null : selectedLesson.questionFileUrl)}
            style={{
              background: selectedPdfUrl === selectedLesson.questionFileUrl ? 'var(--primary-color)' : 'var(--input-bg)',
              color: selectedPdfUrl === selectedLesson.questionFileUrl ? 'white' : 'var(--text-main)',
              border: '1px solid var(--border-color)',
              padding: '0.55rem 1rem',
              borderRadius: '0.5rem',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            📄 {selectedPdfUrl === selectedLesson.questionFileUrl ? 'Ẩn Đề Bài PDF' : 'Xem Đề Bài PDF'}
          </button>
        )}

        {currentUser?.role === 'ROLE_COURSE_PROVIDER' && selectedLesson.solutionFileUrl && (
          <button
            onClick={() => setSelectedPdfUrl(selectedPdfUrl === selectedLesson.solutionFileUrl ? null : selectedLesson.solutionFileUrl)}
            style={{
              background: selectedPdfUrl === selectedLesson.solutionFileUrl ? '#10b981' : 'var(--input-bg)',
              color: selectedPdfUrl === selectedLesson.solutionFileUrl ? 'white' : 'var(--text-main)',
              border: '1px solid var(--border-color)',
              padding: '0.55rem 1rem',
              borderRadius: '0.5rem',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            📝 {selectedPdfUrl === selectedLesson.solutionFileUrl ? 'Ẩn Đáp Án PDF' : 'Xem Đáp Án PDF'}
          </button>
        )}
      </div>

      {/* PDF Preview Frame */}
      {selectedPdfUrl && (
        <div style={{ marginTop: '1.25rem', borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          <iframe
            src={selectedPdfUrl}
            title="Tài liệu bài học"
            style={{ width: '100%', height: '500px', border: 'none', background: 'white' }}
          />
        </div>
      )}
    </div>
  );
};

export default LessonDetailCard;
