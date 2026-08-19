import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import authHeader from '../services/auth-header';

const CourseProviderFeedbacks = () => {
  const { currentUser } = useContext(AuthContext);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchFeedbacks();
  }, [currentUser]);

  const fetchFeedbacks = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError('');
    try {
      // Nếu là Course Provider thì lấy feedback các bài học của provider này
      // Nếu là ADMIN có thể lấy tất cả
      const endpoint = currentUser.role === 'ROLE_ADMIN'
        ? 'http://localhost:8080/api/feedbacks'
        : `http://localhost:8080/api/feedbacks/provider/${currentUser.id}`;

      const res = await axios.get(endpoint, { headers: authHeader() });
      const fbsData = res.data && res.data.result ? res.data.result : res.data;
      setFeedbacks(Array.isArray(fbsData) ? fbsData : []);
    } catch (err) {
      console.error('Error fetching feedbacks:', err);
      setError('Không thể tải danh sách phản hồi từ máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  // Trích xuất danh sách bài học duy nhất từ các phản hồi
  const uniqueLessons = Array.from(
    new Map(
      feedbacks
        .filter((fb) => fb.lesson)
        .map((fb) => [fb.lesson.id, fb.lesson])
    ).values()
  );

  // Lọc theo bài học và từ khóa tìm kiếm
  const filteredFeedbacks = feedbacks.filter((fb) => {
    const matchLesson = selectedLessonId === 'ALL' || (fb.lesson && fb.lesson.id.toString() === selectedLessonId.toString());
    const matchSearch =
      searchTerm.trim() === '' ||
      (fb.comment && fb.comment.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (fb.user?.username && fb.user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (fb.lesson?.title && fb.lesson.title.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchLesson && matchSearch;
  });

  return (
    <div style={{ maxWidth: '1100px', margin: '2rem auto', padding: '1.5rem' }}>
      {/* Header */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: '1.5rem',
        padding: '2rem 2.5rem',
        marginBottom: '2rem',
        border: '1px solid var(--border-color)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            💬 Phản Hồi Từ Học Viên
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Theo dõi tất cả ý kiến đóng góp và nhận xét của học viên về các bài học do bạn tạo.
          </p>
        </div>

        <button
          onClick={fetchFeedbacks}
          style={{
            background: 'var(--input-bg)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            padding: '0.6rem 1.25rem',
            borderRadius: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          🔄 Làm mới
        </button>
      </div>

      {/* Thống kê nhanh */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: '1rem',
          padding: '1.5rem',
          border: '1px solid var(--border-color)',
          borderLeft: '5px solid #6366f1'
        }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Tổng số phản hồi
          </p>
          <p style={{ fontSize: '2rem', fontWeight: 800, color: '#6366f1', margin: '0.5rem 0 0' }}>
            {feedbacks.length}
          </p>
        </div>

        <div style={{
          background: 'var(--card-bg)',
          borderRadius: '1rem',
          padding: '1.5rem',
          border: '1px solid var(--border-color)',
          borderLeft: '5px solid #22c55e'
        }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Bài học có phản hồi
          </p>
          <p style={{ fontSize: '2rem', fontWeight: 800, color: '#22c55e', margin: '0.5rem 0 0' }}>
            {uniqueLessons.length}
          </p>
        </div>

        <div style={{
          background: 'var(--card-bg)',
          borderRadius: '1rem',
          padding: '1.5rem',
          border: '1px solid var(--border-color)',
          borderLeft: '5px solid #f59e0b'
        }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Phản hồi mới nhất
          </p>
          <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.75rem 0 0' }}>
            {feedbacks.length > 0
              ? new Date(feedbacks[0].createdAt).toLocaleDateString('vi-VN')
              : 'Chưa có'}
          </p>
        </div>
      </div>

      {/* Bộ lọc & Tìm kiếm */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: '1rem',
        padding: '1.25rem',
        marginBottom: '1.75rem',
        border: '1px solid var(--border-color)',
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{ flex: '1', minWidth: '220px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            Lọc theo bài học:
          </label>
          <select
            value={selectedLessonId}
            onChange={(e) => setSelectedLessonId(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 1rem',
              borderRadius: '0.6rem',
              border: '1px solid var(--border-color)',
              background: 'var(--input-bg)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem'
            }}
          >
            <option value="ALL">Tất cả bài học ({feedbacks.length})</option>
            {uniqueLessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: '2', minWidth: '260px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            Tìm kiếm phản hồi:
          </label>
          <input
            type="text"
            placeholder="Tìm theo nội dung, tên học viên hoặc tên bài học..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 1rem',
              borderRadius: '0.6rem',
              border: '1px solid var(--border-color)',
              background: 'var(--input-bg)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem'
            }}
          />
        </div>
      </div>

      {/* Trạng thái Loading / Lỗi */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '30vh', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid var(--border-color)', borderTop: '4px solid var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'var(--text-muted)' }}>Đang tải danh sách phản hồi...</p>
        </div>
      )}

      {error && (
        <div style={{ padding: '1.5rem', background: '#fee2e2', borderRadius: '1rem', color: '#dc2626', marginBottom: '1.5rem', textAlign: 'center' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Danh sách Feedback */}
      {!loading && !error && (
        <>
          {filteredFeedbacks.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              background: 'var(--card-bg)',
              borderRadius: '1.25rem',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Không tìm thấy phản hồi nào
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {searchTerm || selectedLessonId !== 'ALL'
                  ? 'Không có phản hồi nào phù hợp với bộ lọc hiện tại.'
                  : 'Chưa có học viên nào gửi phản hồi cho các bài học của bạn.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {filteredFeedbacks.map((fb) => (
                <div
                  key={fb.id}
                  style={{
                    background: 'var(--card-bg)',
                    borderRadius: '1.25rem',
                    padding: '1.75rem',
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                  }}
                >
                  {/* Header feedback card */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '1.1rem'
                      }}>
                        {fb.user?.username ? fb.user.username.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {fb.user?.username || 'Học viên ẩn danh'}
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {fb.user?.gmail || ''}
                        </p>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        background: '#e0e7ff',
                        color: '#3730a3',
                        padding: '4px 12px',
                        borderRadius: '99px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        display: 'inline-block',
                        marginBottom: '0.25rem'
                      }}>
                        📖 {fb.lesson?.title || 'Bài học'}
                      </span>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {fb.createdAt ? new Date(fb.createdAt).toLocaleString('vi-VN') : ''}
                      </p>
                    </div>
                  </div>

                  {/* Nội dung nhận xét */}
                  <div style={{
                    background: 'var(--input-bg)',
                    borderRadius: '0.75rem',
                    padding: '1.25rem',
                    border: '1px solid var(--border-color)',
                    borderLeft: '4px solid var(--primary-color)',
                    fontSize: '0.95rem',
                    color: 'var(--text-primary)',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {fb.comment}
                  </div>

                  {/* Footer feedback card: liên kết bài nộp nếu có */}
                  {fb.submission && (
                    <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                      <Link
                        to={`/submission/${fb.submission.id}/result`}
                        style={{
                          fontSize: '0.85rem',
                          color: 'var(--primary-color)',
                          textDecoration: 'none',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        🔍 Xem bài nộp và kết quả chấm của học viên →
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CourseProviderFeedbacks;
