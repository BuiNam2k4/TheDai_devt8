import React from 'react';

const FeedbackFilterBar = ({
  selectedLessonId,
  setSelectedLessonId,
  uniqueLessons,
  searchTerm,
  setSearchTerm,
}) => {
  return (
    <div
      style={{
        background: 'var(--card-bg)',
        borderRadius: '1rem',
        padding: '1.25rem',
        marginBottom: '1.75rem',
        border: '1px solid var(--border-color)',
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      <div style={{ flex: '1', minWidth: '220px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            marginBottom: '0.35rem',
          }}
        >
          Lọc theo bài học:
        </label>
        <select
          value={selectedLessonId}
          onChange={(e) => setSelectedLessonId(e.target.value)}
          style={{
            width: '100%',
            padding: '0.6rem 0.85rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--border-color)',
            background: 'var(--input-bg)',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          <option value="ALL">Tất cả bài học</option>
          {uniqueLessons.map((lesson) => (
            <option key={lesson.id} value={lesson.id}>
              {lesson.title}
            </option>
          ))}
        </select>
      </div>

      <div style={{ flex: '1', minWidth: '220px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            marginBottom: '0.35rem',
          }}
        >
          Tìm kiếm nội dung / học viên:
        </label>
        <input
          type="text"
          placeholder="🔍 Nhập từ khóa tìm kiếm..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '0.6rem 0.85rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--border-color)',
            background: 'var(--input-bg)',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
          }}
        />
      </div>
    </div>
  );
};

export default FeedbackFilterBar;
