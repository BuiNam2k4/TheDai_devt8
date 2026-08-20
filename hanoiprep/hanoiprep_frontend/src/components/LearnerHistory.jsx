import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

// Import các sub-components đã được module hóa
import HistoryKpis from './history/HistoryKpis';
import HistoryFilterBar from './history/HistoryFilterBar';
import LessonGroupCard from './history/LessonGroupCard';
import TimelineItemCard from './history/TimelineItemCard';
import PaginationBar from './history/PaginationBar';

const ITEMS_PER_PAGE = 10;

const LearnerHistory = () => {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // View mode: 'BY_LESSON' (Theo bài học) hoặc 'TIMELINE' (Toàn bộ lần nộp)
  const [viewMode, setViewMode] = useState('BY_LESSON');
  
  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST');

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);

  // Quản lý các bài học đang mở rộng accordion
  const [expandedLessonIds, setExpandedLessonIds] = useState({});

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    fetchHistory();
  }, [currentUser]);

  // Reset về trang 1 khi đổi bộ lọc hoặc chế độ xem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortBy, viewMode]);

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
  // 1. GOM NHÓM DỮ LIỆU THEO BÀI HỌC
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

  const lessonStatsList = Object.values(lessonStatsMap).map((group) => {
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
  // 2. TÍNH TOÁN CÁC THÔNG SỐ KPI TỔNG QUAN
  // ─────────────────────────────────────────────────────────────────────────────
  const totalLessonsParticipated = lessonStatsList.length;
  const totalSubmissionsCount = submissions.length;

  const allGradedSubs = submissions.filter((s) => s.status === 'GRADED' && s.totalScore != null);
  const overallAverageScore = allGradedSubs.length > 0
    ? (allGradedSubs.reduce((acc, curr) => acc + curr.totalScore, 0) / allGradedSubs.length).toFixed(1)
    : '0.0';

  const excellentLessonsCount = lessonStatsList.filter((g) => g.bestScore != null && g.bestScore >= 8.0).length;
  const overallMaxScore = allGradedSubs.length > 0
    ? Math.max(...allGradedSubs.map((s) => s.totalScore)).toFixed(1)
    : '0.0';

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. LỌC VÀ PHÂN TRANG (FILTER & PAGINATION)
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
      if (sortBy === 'NEWEST') return new Date(b.latestSubmissionDate || 0) - new Date(a.latestSubmissionDate || 0);
      if (sortBy === 'OLDEST') return new Date(a.latestSubmissionDate || 0) - new Date(b.latestSubmissionDate || 0);
      if (sortBy === 'SCORE_DESC') return (b.bestScore || 0) - (a.bestScore || 0);
      if (sortBy === 'SCORE_ASC') return (a.bestScore || 0) - (b.bestScore || 0);
      if (sortBy === 'ATTEMPTS_DESC') return b.submissions.length - a.submissions.length;
      return 0;
    });

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

  // Paged slices (10 phần tử / trang)
  const totalLessonItems = filteredLessonList.length;
  const totalLessonPages = Math.ceil(totalLessonItems / ITEMS_PER_PAGE) || 1;
  const pagedLessonList = filteredLessonList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const totalTimelineItems = filteredTimelineList.length;
  const totalTimelinePages = Math.ceil(totalTimelineItems / ITEMS_PER_PAGE) || 1;
  const pagedTimelineList = filteredTimelineList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const totalCurrentItems = viewMode === 'BY_LESSON' ? totalLessonItems : totalTimelineItems;
  const totalCurrentPages = viewMode === 'BY_LESSON' ? totalLessonPages : totalTimelinePages;
  const startItemIndex = totalCurrentItems > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const endItemIndex = Math.min(currentPage * ITEMS_PER_PAGE, totalCurrentItems);

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

      {/* KPI Overview Cards Component */}
      <HistoryKpis
        totalLessonsParticipated={totalLessonsParticipated}
        totalSubmissionsCount={totalSubmissionsCount}
        overallAverageScore={overallAverageScore}
        allGradedCount={allGradedSubs.length}
        excellentLessonsCount={excellentLessonsCount}
        overallMaxScore={overallMaxScore}
      />

      {/* Filter, Search & View Mode Bar Component */}
      <HistoryFilterBar
        viewMode={viewMode}
        setViewMode={setViewMode}
        totalLessons={lessonStatsList.length}
        totalSubmissions={submissions.length}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {pagedLessonList.map((group) => (
            <LessonGroupCard
              key={group.lessonId}
              group={group}
              isExpanded={!!expandedLessonIds[group.lessonId]}
              onToggleExpand={toggleExpandLesson}
              statusFilter={statusFilter}
            />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {pagedTimelineList.map((sub) => (
            <TimelineItemCard key={sub.id} sub={sub} />
          ))}
        </div>
      )}

      {/* Pagination Bar Component */}
      <PaginationBar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalCurrentPages={totalCurrentPages}
        startItemIndex={startItemIndex}
        endItemIndex={endItemIndex}
        totalCurrentItems={totalCurrentItems}
        itemLabel={viewMode === 'BY_LESSON' ? 'bài học' : 'lần nộp'}
      />
    </div>
  );
};

export default LearnerHistory;
