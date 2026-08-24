import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import authHeader from '../services/auth-header';

// Subcomponents
import FeedbackStatsCards from './feedbacks/FeedbackStatsCards';
import FeedbackFilterBar from './feedbacks/FeedbackFilterBar';
import FeedbackItemCard from './feedbacks/FeedbackItemCard';

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
      const endpoint =
        currentUser.role === 'ROLE_ADMIN'
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

  const uniqueLessons = Array.from(
    new Map(
      feedbacks
        .filter((fb) => fb.lesson)
        .map((fb) => [fb.lesson.id, fb.lesson])
    ).values()
  );

  const filteredFeedbacks = feedbacks.filter((fb) => {
    const matchLesson =
      selectedLessonId === 'ALL' ||
      (fb.lesson && fb.lesson.id.toString() === selectedLessonId.toString());
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
      <div
        style={{
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
          gap: '1rem',
        }}
      >
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
            gap: '0.5rem',
          }}
        >
          🔄 Làm mới
        </button>
      </div>

      {/* Thống kê nhanh */}
      <FeedbackStatsCards
        totalFeedbacks={feedbacks.length}
        uniqueLessonsCount={uniqueLessons.length}
        latestFeedbackDate={feedbacks.length > 0 ? feedbacks[0].createdAt : null}
      />

      {/* Bộ lọc & Tìm kiếm */}
      <FeedbackFilterBar
        selectedLessonId={selectedLessonId}
        setSelectedLessonId={setSelectedLessonId}
        uniqueLessons={uniqueLessons}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      {/* Danh sách phản hồi */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '30vh', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTop: '3px solid var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'var(--text-muted)' }}>Đang tải danh sách phản hồi...</p>
        </div>
      ) : error ? (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626', padding: '1.25rem', borderRadius: '1rem', textAlign: 'center' }}>
          ⚠️ {error}
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <div style={{ background: 'var(--card-bg)', borderRadius: '1.25rem', padding: '3.5rem 2rem', textAlign: 'center', border: '1px dashed var(--border-color)' }}>
          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.75rem' }}>📭</span>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Không có phản hồi nào
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>
            {searchTerm || selectedLessonId !== 'ALL'
              ? 'Không tìm thấy phản hồi nào khớp với bộ lọc hiện tại.'
              : 'Hiện chưa có học viên nào gửi phản hồi về bài học của bạn.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {filteredFeedbacks.map((fb) => (
            <FeedbackItemCard key={fb.id} fb={fb} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CourseProviderFeedbacks;
