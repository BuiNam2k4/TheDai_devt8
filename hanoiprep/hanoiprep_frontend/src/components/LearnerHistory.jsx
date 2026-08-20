import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const LearnerHistory = () => {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // View mode: 'BY_LESSON' (Thống kê theo từng bài học) hoặc 'TIMELINE' (Danh sách tất cả các lần nộp)
  const [viewMode, setViewMode] = useState('BY_LESSON');
  
  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST');

  // Quản lý các bài học đang mở rộng danh sách lần nộp (Expanded accordion)
  const [expandedLessonIds, setExpandedLessonIds] = useState({});

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    fetchHistory();
  }, [currentUser]);

  const authHeader = () => {
    if (currentUser && currentUser.token) {
      return { Authorization: 'Bearer ' + currentUser.token };
    }
    return {};
  };

  const fetchHistory = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`http://localhost:8080/api/submissions/user/${currentUser.id}`, {
        headers: authHeader(),
      });
      const data = res.data && res.data.result ? res.data.result : res.data;
      setSubmissions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching submissions history:', err);
      setError('Không thể tải lịch sử làm bài. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpandLesson = (lessonId) => {
    setExpandedLessonIds((prev) => ({
      ...prev,
      [lessonId]: !prev[lessonId],
    }));
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. NHÓM VÀ THỐNG KÊ THEO TỪNG BÀI HỌC (GROUP BY LESSON)
  // ─────────────────────────────────────────────────────────────────────────────
  const lessonStatsMap = {};

  submissions.forEach((sub) => {
    const lessonId = sub.lesson?.id || 'UNKNOWN';
    if (!lessonStatsMap[lessonId]) {
      lessonStatsMap[lessonId] = {
        lessonId: lessonId,
        lesson: sub.lesson || { title: 'Bài tập không xác định', category: 'Toán' },
        submissions: [],
        bestScore: null,
        latestScore: null,
        averageScore: 0,
        gradedCount: 0,
        pendingCount: 0,
        latestSubmissionDate: null,
      };
    }

    const group = lessonStatsMap[lessonId];
    group.submissions.push(sub);

    if (sub.status === 'GRADED' && sub.totalScore != null) {
      group.gradedCount += 1;
      if (group.bestScore === null || sub.totalScore > group.bestScore) {
        group.bestScore = sub.totalScore;
      }
    } else {
      group.pendingCount += 1;
    }
  });

  // Tính điểm trung bình và ngày nộp mới nhất cho từng bài học
  const lessonStatsList = Object.values(lessonStatsMap).map((group) => {
    // Sắp xếp các lần nộp của bài học này theo thời gian mới nhất lên đầu
    group.submissions.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const latestSub = group.submissions[0];
    group.latestScore = latestSub?.status === 'GRADED' ? latestSub.totalScore : null;
    group.latestSubmissionDate = latestSub?.createdAt || null;

    if (group.gradedCount > 0) {
      const sum = group.submissions
        .filter((s) => s.status === 'GRADED' && s.totalScore != null)
        .reduce((acc, curr) => acc + curr.totalScore, 0);
      group.averageScore = parseFloat((sum / group.gradedCount).toFixed(1));
    } else {
      group.averageScore = null;
    }

    return group;
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. TÍNH TOÁN CÁC THẺ KPI TỔNG QUAN (OVERVIEW KPIS)
  // ─────────────────────────────────────────────────────────────────────────────
  const totalLessonsParticipated = lessonStatsList.length;
  const totalSubmissionsCount = submissions.length;

  const allGradedSubs = submissions.filter((s) => s.status === 'GRADED' && s.totalScore != null);
  const overallAverageScore = allGradedSubs.length > 0
    ? (allGradedSubs.reduce((acc, curr) => acc + curr.totalScore, 0) / allGradedSubs.length).toFixed(1)
    : '0.0';

  // Số bài học đạt điểm cao nhất >= 8.0
  const excellentLessonsCount = lessonStatsList.filter((g) => g.bestScore != null && g.bestScore >= 8.0).length;

  // Điểm cao nhất từng đạt được trong toàn bộ khóa học
  const overallMaxScore = allGradedSubs.length > 0
    ? Math.max(...allGradedSubs.map((s) => s.totalScore)).toFixed(1)
    : '0.0';

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. LỌC VÀ SẮP XẾP DANH SÁCH BÀI HỌC (FILTER & SORT)
  // ─────────────────────────────────────────────────────────────────────────────
  const filteredLessonList = lessonStatsList
    .filter((group) => {
      const matchSearch =
        searchTerm.trim() === '' ||
        (group.lesson?.title && group.lesson.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (group.lesson?.category && group.lesson.category.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'GRADED' && group.gradedCount > 0) ||
        (statusFilter === 'PENDING' && group.pendingCount > 0);

      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'NEWEST') {
        return new Date(b.latestSubmissionDate || 0) - new Date(a.latestSubmissionDate || 0);
      }
      if (sortBy === 'OLDEST') {
        return new Date(a.latestSubmissionDate || 0) - new Date(b.latestSubmissionDate || 0);
      }
      if (sortBy === 'SCORE_DESC') {
        return (b.bestScore || 0) - (a.bestScore || 0);
      }
      if (sortBy === 'SCORE_ASC') {
        return (a.bestScore || 0) - (b.bestScore || 0);
      }
      if (sortBy === 'ATTEMPTS_DESC') {
        return b.submissions.length - a.submissions.length;
      }
      return 0;
    });

  // Lọc danh sách phẳng tất cả lần nộp (khi ở chế độ TIMELINE)
  const filteredTimelineList = submissions
    .filter((sub) => {
      const matchSearch =
        searchTerm.trim() === '' ||
        (sub.lesson?.title && sub.lesson.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sub.lesson?.category && sub.lesson.category.toLowerCase().includes(searchTerm.toLowerCase()));

      const isSubGraded = sub.status === 'GRADED' && sub.totalScore != null;
      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'GRADED' && isSubGraded) ||
        (statusFilter === 'PENDING' && !isSubGraded);

      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'NEWEST') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if (sortBy === 'OLDEST') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      if (sortBy === 'SCORE_DESC') return (b.totalScore || 0) - (a.totalScore || 0);
      if (sortBy === 'SCORE_ASC') return (a.totalScore || 0) - (b.totalScore || 0);
      return 0;
    });

  const getScoreColor = (score) => {
    if (score == null) return '#94a3b8';
    if (score >= 8.0) return '#10b981'; // Green
    if (score >= 5.0) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  const getEvaluationBadge = (bestScore) => {
    if (bestScore == null) {
      return { text: 'Chờ chấm điểm', bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' };
    }
    if (bestScore >= 8.5) {
      return { text: '🏆 Xuất sắc', bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' };
    }
    if (bestScore >= 7.0) {
      return { text: '⭐ Khá - Giỏi', bg: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' };
    }
    if (bestScore >= 5.0) {
      return { text: '👍 Đạt yêu cầu', bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' };
    }
    return { text: '⚠️ Cần cải thiện', bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171' };
  };

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span>📊</span> Thống Kê Điểm Số & Lịch Sử Làm Bài
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.95rem' }}>
            Tổng hợp kết quả học tập chi tiết được chia theo từng bài học và tiến trình cải thiện điểm số
          </p>
        </div>
        <Link
          to="/learner/lessons"
          style={{
            background: 'var(--primary-color)',
            color: 'white',
            padding: '0.65rem 1.25rem',
            borderRadius: '0.5rem',
            fontWeight: '600',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'background 0.2s',
          }}
        >
          <span>✍️</span> Danh Sách Bài Học
        </Link>
      </div>

      {/* KPI Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem', backdropFilter: 'blur(10px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '500' }}>BÀI HỌC ĐÃ THAM GIA</span>
            <span style={{ fontSize: '1.4rem' }}>📚</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '700', color: 'var(--text-main)', marginTop: '0.5rem' }}>
            {totalLessonsParticipated} <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: '400' }}>bài học</span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
            Tổng cộng {totalSubmissionsCount} lượt nộp bài
          </div>
        </div>

        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem', backdropFilter: 'blur(10px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '500' }}>ĐIỂM TRUNG BÌNH (GPA)</span>
            <span style={{ fontSize: '1.4rem' }}>🎯</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '700', color: getScoreColor(parseFloat(overallAverageScore)), marginTop: '0.5rem' }}>
            {overallAverageScore} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 10</span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
            Tính trên {allGradedSubs.length} bài đã chấm
          </div>
        </div>

        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem', backdropFilter: 'blur(10px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '500' }}>BÀI ĐẠT LOẠI GIỎI (≥ 8.0)</span>
            <span style={{ fontSize: '1.4rem' }}>⭐</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '700', color: '#10b981', marginTop: '0.5rem' }}>
            {excellentLessonsCount} <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: '400' }}>/ {totalLessonsParticipated} bài</span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
            {totalLessonsParticipated > 0 ? Math.round((excellentLessonsCount / totalLessonsParticipated) * 100) : 0}% bài học đạt chuẩn
          </div>
        </div>

        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem', backdropFilter: 'blur(10px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '500' }}>ĐIỂM CAO NHẤT ĐẠT ĐƯỢC</span>
            <span style={{ fontSize: '1.4rem' }}>🏆</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '700', color: '#818cf8', marginTop: '0.5rem' }}>
            {overallMaxScore} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 10</span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
            Kỷ lục điểm số cao nhất của bạn
          </div>
        </div>
      </div>

      {/* View Mode Toggle & Filter Bar */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Toggle Mode Tabs */}
        <div style={{ display: 'flex', background: 'var(--input-bg)', padding: '0.3rem', borderRadius: '0.6rem', border: '1px solid var(--border-color)' }}>
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
            <span>📚</span> Thống Kê Theo Bài Học ({lessonStatsList.length})
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
            <span>🕒</span> Toàn Bộ Lần Nộp ({submissions.length})
          </button>
        </div>

        {/* Search & Sort */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', flex: '1', justifyContent: 'flex-end' }}>
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

      {/* Main Content Render */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 0', gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTop: '3px solid var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'var(--text-muted)' }}>Đang tổng hợp dữ liệu học tập...</p>
        </div>
      ) : error ? (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '1.25rem', borderRadius: '0.75rem', textAlign: 'center' }}>
          {error}
        </div>
      ) : (viewMode === 'BY_LESSON' ? filteredLessonList.length === 0 : filteredTimelineList.length === 0) ? (
        <div style={{ background: 'var(--card-bg)', border: '1px dashed var(--border-color)', borderRadius: '0.75rem', padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            Chưa có dữ liệu bài làm
          </h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '450px', margin: '0 auto 1.5rem' }}>
            {searchTerm || statusFilter !== 'ALL'
              ? 'Không tìm thấy bài học nào khớp với bộ lọc của bạn.'
              : 'Bạn chưa nộp bài tập nào. Hãy chọn một bài học trong danh sách để bắt đầu luyện tập và nhận đánh giá từ AI!'}
          </p>
          <Link
            to="/learner/lessons"
            style={{
              display: 'inline-block',
              background: 'var(--primary-color)',
              color: 'white',
              padding: '0.65rem 1.5rem',
              borderRadius: '0.5rem',
              fontWeight: '600',
              fontSize: '0.9rem',
            }}
          >
            Khám Phá Bài Học Ngay
          </Link>
        </div>
      ) : viewMode === 'BY_LESSON' ? (
        /* ─────────────────────────────────────────────────────────────────────────────
           RENDER CHẾ ĐỘ 1: THỐNG KÊ THEO TỪNG BÀI HỌC (BY LESSON)
        ───────────────────────────────────────────────────────────────────────────── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {filteredLessonList.map((group) => {
            const isExpanded = !!expandedLessonIds[group.lessonId];
            const badge = getEvaluationBadge(group.bestScore);
            const bestScoreColor = getScoreColor(group.bestScore);

            // Lọc các lần nộp hiển thị theo đúng bộ lọc
            const visibleSubmissions = group.submissions.filter((s) => {
              const isSubGraded = s.status === 'GRADED' && s.totalScore != null;
              if (statusFilter === 'GRADED') return isSubGraded;
              if (statusFilter === 'PENDING') return !isSubGraded;
              return true;
            });

            const latestGradedSub = group.submissions.find((s) => s.status === 'GRADED' && s.totalScore != null);
            const displayLatestScore = statusFilter === 'GRADED' ? latestGradedSub?.totalScore : group.latestScore;
            const displayLatestScoreColor = getScoreColor(displayLatestScore);

            return (
              <div
                key={group.lessonId}
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.85rem',
                  overflow: 'hidden',
                  backdropFilter: 'blur(10px)',
                  transition: 'border-color 0.2s',
                }}
              >
                {/* Lesson Header Card */}
                <div style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  {/* Left: Info */}
                  <div style={{ flex: '1', minWidth: '280px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.75rem', background: badge.bg, color: badge.color, padding: '0.2rem 0.6rem', borderRadius: '1rem', fontWeight: '700' }}>
                        {badge.text}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        🏷️ {group.lesson?.category || 'Toán học'}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                      {group.lesson?.title || 'Bài tập Toán'}
                    </h3>

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      <span>📝 <strong>{visibleSubmissions.length}</strong> {statusFilter === 'GRADED' ? 'lần đã có điểm' : statusFilter === 'PENDING' ? 'lần đang chấm' : 'lần làm bài'}</span>
                      <span>•</span>
                      <span>🕒 Lần nộp gần nhất: {group.latestSubmissionDate ? new Date(group.latestSubmissionDate).toLocaleString('vi-VN') : 'N/A'}</span>
                    </div>
                  </div>

                  {/* Middle: Score Summary Stats */}
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', background: 'var(--input-bg)', padding: '0.75rem 1.25rem', borderRadius: '0.6rem', border: '1px solid var(--border-color)' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>ĐIỂM CAO NHẤT</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: '800', color: bestScoreColor, marginTop: '2px' }}>
                        {group.bestScore != null ? group.bestScore.toFixed(1) : '--'}
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '400' }}>/10</span>
                      </div>
                    </div>

                    <div style={{ width: '1px', height: '30px', background: 'var(--border-color)' }} />

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>LẦN GẦN NHẤT</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: '800', color: displayLatestScoreColor, marginTop: '2px' }}>
                        {displayLatestScore != null ? displayLatestScore.toFixed(1) : (statusFilter === 'PENDING' || group.pendingCount > 0 ? 'Đang chấm' : '--')}
                      </div>
                    </div>

                    {group.averageScore != null && (
                      <>
                        <div style={{ width: '1px', height: '30px', background: 'var(--border-color)' }} />
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>TRUNG BÌNH</div>
                          <div style={{ fontSize: '1.35rem', fontWeight: '800', color: getScoreColor(group.averageScore), marginTop: '2px' }}>
                            {group.averageScore.toFixed(1)}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      onClick={() => toggleExpandLesson(group.lessonId)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)',
                        padding: '0.55rem 0.9rem',
                        borderRadius: '0.5rem',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <span>{isExpanded ? '▲ Thu gọn' : `▼ Xem ${visibleSubmissions.length} lần nộp`}</span>
                    </button>

                    <Link
                      to="/learner/lessons"
                      style={{
                        background: 'var(--primary-color)',
                        color: 'white',
                        padding: '0.55rem 0.9rem',
                        borderRadius: '0.5rem',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <span>🔄</span> Làm lại
                    </Link>
                  </div>
                </div>

                {/* Expanded Accordion: Submissions List for this specific lesson */}
                {isExpanded && (
                  <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderTop: '1px solid var(--border-color)', padding: '1rem 1.25rem' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      📋 Lịch sử các lần nộp của bài học này:
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {visibleSubmissions.map((sub, idx) => {
                        const isGraded = sub.status === 'GRADED' && sub.totalScore != null;
                        const score = sub.totalScore;
                        const scoreColor = isGraded && score != null ? getScoreColor(score) : '#94a3b8';
                        const attemptNo = visibleSubmissions.length - idx; // Đánh số lần nộp

                        return (
                          <div
                            key={sub.id}
                            style={{
                              background: 'var(--card-bg)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '0.5rem',
                              padding: '0.75rem 1rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '0.75rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary-color)', padding: '0.2rem 0.5rem', borderRadius: '0.35rem', fontSize: '0.75rem', fontWeight: '700' }}>
                                Lần {attemptNo}
                              </span>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                                🕒 {sub.createdAt ? new Date(sub.createdAt).toLocaleString('vi-VN') : 'N/A'}
                              </span>
                              {sub.answerFileUrl && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  📎 Có đính kèm file
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              {isGraded ? (
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                                  <span style={{ fontSize: '1.15rem', fontWeight: '800', color: scoreColor }}>
                                    {score != null ? score.toFixed(1) : 'N/A'}
                                  </span>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ 10</span>
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: '600' }}>
                                  ⏳ Đang chấm AI...
                                </span>
                              )}

                              <button
                                onClick={() => navigate(`/submission/${sub.id}/result`)}
                                style={{
                                  background: isGraded ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.06)',
                                  color: isGraded ? '#818cf8' : 'var(--text-muted)',
                                  border: '1px solid rgba(99, 102, 241, 0.3)',
                                  padding: '0.35rem 0.75rem',
                                  borderRadius: '0.4rem',
                                  fontSize: '0.8rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                }}
                              >
                                {isGraded ? '🔍 Xem Chi Tiết Barem' : 'Xem Tiến Trình'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────────────────────
           RENDER CHẾ ĐỘ 2: DANH SÁCH TẤT CẢ CÁC LẦN NỘP (TIMELINE)
        ───────────────────────────────────────────────────────────────────────────── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {filteredTimelineList.map((sub) => {
            const isGraded = sub.status === 'GRADED';
            const score = sub.totalScore;
            const scoreColor = isGraded && score != null ? getScoreColor(score) : '#94a3b8';

            return (
              <div
                key={sub.id}
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.75rem',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', flex: '1', minWidth: '260px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '0.5rem', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.9rem', flexShrink: 0 }}>
                    #{sub.id}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                      {sub.lesson?.title || 'Bài tập Toán học'}
                    </h4>
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <span>🏷️ {sub.lesson?.category || 'Toán'}</span>
                      <span>•</span>
                      <span>🕒 {sub.createdAt ? new Date(sub.createdAt).toLocaleString('vi-VN') : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  {isGraded ? (
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.3rem', fontWeight: '800', color: scoreColor }}>
                        {score != null ? score.toFixed(1) : 'N/A'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '2px' }}>/ 10</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: '600', background: 'rgba(245, 158, 11, 0.15)', padding: '0.25rem 0.6rem', borderRadius: '1rem' }}>
                      Đang chấm AI...
                    </span>
                  )}

                  <button
                    onClick={() => navigate(`/submission/${sub.id}/result`)}
                    style={{
                      background: isGraded ? 'var(--primary-color)' : 'rgba(255,255,255,0.08)',
                      color: 'white',
                      border: 'none',
                      padding: '0.45rem 0.85rem',
                      borderRadius: '0.4rem',
                      fontWeight: '600',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    🔍 Xem Bài Chấm
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LearnerHistory;
