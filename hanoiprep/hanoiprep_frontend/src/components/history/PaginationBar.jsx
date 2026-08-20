import React from 'react';

const PaginationBar = ({
  currentPage,
  setCurrentPage,
  totalCurrentPages,
  startItemIndex,
  endItemIndex,
  totalCurrentItems,
  itemLabel = 'mục',
}) => {
  if (totalCurrentPages <= 1) return null;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginTop: '2rem',
        padding: '1rem 1.25rem',
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '0.75rem',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Hiển thị <strong>{startItemIndex} - {endItemIndex}</strong> trong tổng số <strong>{totalCurrentItems}</strong>{' '}
        {itemLabel}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          style={{
            background: currentPage === 1 ? 'rgba(255,255,255,0.04)' : 'var(--input-bg)',
            color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-main)',
            border: '1px solid var(--border-color)',
            padding: '0.45rem 0.85rem',
            borderRadius: '0.4rem',
            fontSize: '0.85rem',
            fontWeight: '600',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            opacity: currentPage === 1 ? 0.4 : 1,
          }}
        >
          « Trước
        </button>

        {Array.from({ length: totalCurrentPages }, (_, i) => i + 1).map((pageNum) => (
          <button
            key={pageNum}
            onClick={() => setCurrentPage(pageNum)}
            style={{
              background: currentPage === pageNum ? 'var(--primary-color)' : 'var(--input-bg)',
              color: currentPage === pageNum ? 'white' : 'var(--text-main)',
              border: currentPage === pageNum ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
              minWidth: '36px',
              height: '36px',
              padding: '0 0.5rem',
              borderRadius: '0.4rem',
              fontSize: '0.85rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {pageNum}
          </button>
        ))}

        <button
          disabled={currentPage === totalCurrentPages}
          onClick={() => setCurrentPage((prev) => Math.min(totalCurrentPages, prev + 1))}
          style={{
            background: currentPage === totalCurrentPages ? 'rgba(255,255,255,0.04)' : 'var(--input-bg)',
            color: currentPage === totalCurrentPages ? 'var(--text-muted)' : 'var(--text-main)',
            border: '1px solid var(--border-color)',
            padding: '0.45rem 0.85rem',
            borderRadius: '0.4rem',
            fontSize: '0.85rem',
            fontWeight: '600',
            cursor: currentPage === totalCurrentPages ? 'not-allowed' : 'pointer',
            opacity: currentPage === totalCurrentPages ? 0.4 : 1,
          }}
        >
          Sau »
        </button>
      </div>
    </div>
  );
};

export default PaginationBar;
