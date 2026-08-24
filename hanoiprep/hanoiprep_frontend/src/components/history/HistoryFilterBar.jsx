import React from 'react';

const HistoryFilterBar = ({
  viewMode,
  setViewMode,
  totalLessons,
  totalSubmissions,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy,
}) => {
  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '0.75rem',
        padding: '1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* Toggle Mode Tabs */}
      <div
        style={{
          display: 'flex',
          background: 'var(--input-bg)',
          padding: '0.3rem',
          borderRadius: '0.6rem',
          border: '1px solid var(--border-color)',
        }}
      >
        <button
          onClick={() => setViewMode('BY_LESSON')}
          style={{
            background: viewMode === 'BY_LESSON' ? 'var(--primary-color)' : 'transparent',
            color: viewMode === 'BY_LESSON' ? 'white' : 'var(--text-muted)',
            border: 'none',
            padding: '0.45rem 1rem',
            borderRadius: '0.4rem',
            fontWeight: '600',
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s',
          }}
        >
          <span>📚</span> Theo Bài Học ({totalLessons})
        </button>
        <button
          onClick={() => setViewMode('TIMELINE')}
          style={{
            background: viewMode === 'TIMELINE' ? 'var(--primary-color)' : 'transparent',
            color: viewMode === 'TIMELINE' ? 'white' : 'var(--text-muted)',
            border: 'none',
            padding: '0.45rem 1rem',
            borderRadius: '0.4rem',
            fontWeight: '600',
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s',
          }}
        >
          <span>🕒</span> Toàn Bộ Lần Nộp ({totalSubmissions})
        </button>
      </div>

      {/* Search, Filter & Sort */}
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          flex: '1',
          justifyContent: 'flex-end',
        }}
      >
        <input
          type="text"
          placeholder="🔍 Tìm theo tên bài học..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            minWidth: '200px',
            background: 'var(--input-bg)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-main)',
            padding: '0.5rem 0.85rem',
            borderRadius: '0.5rem',
            fontSize: '0.85rem',
            outline: 'none',
          }}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            background: 'var(--input-bg)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-main)',
            padding: '0.5rem 0.85rem',
            borderRadius: '0.5rem',
            fontSize: '0.85rem',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="GRADED">Đã có điểm</option>
          <option value="PENDING">Đang chờ chấm</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            background: 'var(--input-bg)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-main)',
            padding: '0.5rem 0.85rem',
            borderRadius: '0.5rem',
            fontSize: '0.85rem',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="NEWEST">Mới nhất trước</option>
          <option value="OLDEST">Cũ nhất trước</option>
          <option value="SCORE_DESC">Điểm cao nhất</option>
          <option value="SCORE_ASC">Điểm thấp nhất</option>
          {viewMode === 'BY_LESSON' && <option value="ATTEMPTS_DESC">Làm nhiều lần nhất</option>}
        </select>
      </div>
    </div>
  );
};

export default HistoryFilterBar;
