import React from 'react';

const LessonSidebar = ({ availableLessons, selectedLesson, onSelectLesson }) => {
  return (
    <div style={{ flex: '1', minWidth: '280px', maxWidth: '350px' }}>
      <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-main)' }}>
        📚 Danh Sách Bài Học ({availableLessons.length})
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '75vh', overflowY: 'auto' }}>
        {availableLessons.length === 0 ? (
          <div style={{ padding: '1.5rem', background: 'var(--card-bg)', borderRadius: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', border: '1px dashed var(--border-color)' }}>
            Chưa có bài học nào khả dụng.
          </div>
        ) : (
          availableLessons.map((lesson) => {
            const isSelected = selectedLesson?.id === lesson.id;
            return (
              <div
                key={lesson.id}
                onClick={() => onSelectLesson(lesson)}
                style={{
                  background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'var(--card-bg)',
                  border: isSelected ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: '700', textTransform: 'uppercase' }}>
                    🏷️ {lesson.category || 'Toán học'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    #{lesson.id}
                  </span>
                </div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
                  {lesson.title}
                </h4>
                {lesson.description && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lesson.description}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default LessonSidebar;
