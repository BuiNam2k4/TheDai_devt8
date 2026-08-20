import React, { useState } from 'react';

const LessonDetailCard = ({ selectedLesson, currentUser }) => {
  const [downloading, setDownloading] = useState(false);

  if (!selectedLesson) return null;

  const handleDownload = async (url, fallbackType) => {
    if (!url) return;
    setDownloading(true);

    const safeTitle = (selectedLesson.title || 'BaiHoc')
      .replace(/[^a-zA-Z0-9\s_-]/g, '')
      .trim()
      .replace(/\s+/g, '_');
    const filename = `${safeTitle}_${fallbackType}.pdf`;

    try {
      // 1. Thử fetch trực tiếp qua blob
      const response = await fetch(url);
      if (!response.ok) throw new Error('Fetch failed');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.warn("Direct blob fetch failed, falling back to backend download proxy:", error);
      // 2. Fallback qua endpoint backend để đảm bảo 100% tải đúng file .pdf không mã hóa
      const backendType = fallbackType === 'DapAn' ? 'solution' : 'question';
      const backendDownloadUrl = `http://localhost:8080/api/lessons/${selectedLesson.id}/download/${backendType}`;
      
      const link = document.createElement('a');
      link.href = backendDownloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } finally {
      setDownloading(false);
    }
  };

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
      {/* Thông tin bài học */}
      <div style={{ marginBottom: '1rem' }}>
        <span
          style={{
            fontSize: '0.8rem',
            background: 'rgba(99, 102, 241, 0.15)',
            color: 'var(--primary-color)',
            padding: '3px 10px',
            borderRadius: '99px',
            fontWeight: '700',
          }}
        >
          🏷️ {selectedLesson.category || 'Toán học'}
        </span>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-main)', marginTop: '0.5rem', marginBottom: '0.25rem' }}>
          {selectedLesson.title}
        </h2>
        {selectedLesson.description && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.25rem 0' }}>
            {selectedLesson.description}
          </p>
        )}
        {selectedLesson.contentText && (
          <div
            style={{
              marginTop: '0.75rem',
              padding: '0.85rem 1rem',
              background: 'var(--input-bg)',
              borderRadius: '0.5rem',
              color: 'var(--text-main)',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              border: '1px solid var(--border-color)',
            }}
          >
            {selectedLesson.contentText}
          </div>
        )}
      </div>

      {/* Các liên kết Tải Đề Bài và Tải Đáp Án */}
      <div
        style={{
          background: 'var(--input-bg)',
          padding: '1rem 1.25rem',
          borderRadius: '0.75rem',
          borderLeft: '4px solid var(--primary-color)',
          border: '1px solid var(--border-color)',
          marginTop: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Tải Đề Bài */}
          {selectedLesson.questionFileUrl && (
            <div>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleDownload(selectedLesson.questionFileUrl, 'DeBai');
                }}
                style={{
                  color: '#10b981',
                  textDecoration: 'underline',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: downloading ? 'wait' : 'pointer',
                }}
              >
                <span>📎</span> Tải Đề Bài (PDF)
              </a>
            </div>
          )}

          {/* Tải Đáp Án / Hướng Dẫn Giải */}
          {selectedLesson.solutionFileUrl && (currentUser?.role === 'ROLE_COURSE_PROVIDER' || currentUser?.role === 'ROLE_ADMIN') && (
            <div>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleDownload(selectedLesson.solutionFileUrl, 'DapAn');
                }}
                style={{
                  color: '#10b981',
                  textDecoration: 'underline',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: downloading ? 'wait' : 'pointer',
                }}
              >
                <span>📎</span> Tải Đáp Án / Hướng Dẫn Giải (Dành cho Provider)
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LessonDetailCard;
