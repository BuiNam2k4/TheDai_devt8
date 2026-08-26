import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import authHeader from '../services/auth-header';

// Subcomponents
import LessonSidebar from './lessons/LessonSidebar';
import LessonDetailCard from './lessons/LessonDetailCard';
import LessonSubmitForm from './lessons/LessonSubmitForm';
import LessonProviderSubmissions from './lessons/LessonProviderSubmissions';

const LessonView = () => {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [availableLessons, setAvailableLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [lessonFeedbacks, setLessonFeedbacks] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answerText, setAnswerText] = useState('');

  useEffect(() => {
    if (currentUser?.role === 'ROLE_ADMIN') {
      navigate('/admin/users');
      return;
    }
    fetchLessons();
  }, [currentUser, navigate]);

  const fetchLessons = async () => {
    try {
      const res = await axios.get('http://localhost:8080/api/lessons', { headers: authHeader() });
      const lessonsData = res.data && res.data.result ? res.data.result : res.data;
      
      const validLessons = (Array.isArray(lessonsData) ? lessonsData : []).filter(
        (lesson) => lesson.title && (lesson.questionFileUrl || lesson.solutionFileUrl || lesson.materialFileUrl || lesson.contentText)
      );
      
      setAvailableLessons(validLessons);
    } catch (error) {
      console.error('Error fetching lessons', error);
    }
  };

  const handleSelectLesson = async (lesson) => {
    setSelectedLesson(lesson);
    if (currentUser?.role === 'ROLE_COURSE_PROVIDER') {
      try {
        const subRes = await axios.get(`http://localhost:8080/api/submissions/lesson/${lesson.id}`, {
          headers: authHeader(),
        });
        const subsData = subRes.data && subRes.data.result ? subRes.data.result : subRes.data;
        setSubmissions(Array.isArray(subsData) ? subsData : []);
      } catch (error) {
        console.error('Error fetching submissions', error);
      }

      try {
        const fbRes = await axios.get(`http://localhost:8080/api/feedbacks/lesson/${lesson.id}`, {
          headers: authHeader(),
        });
        const fbsData = fbRes.data && fbRes.data.result ? fbRes.data.result : fbRes.data;
        setLessonFeedbacks(Array.isArray(fbsData) ? fbsData : []);
      } catch (error) {
        console.error('Error fetching feedbacks', error);
      }
    }
  };

  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      alert('Vui lòng đăng nhập trước khi nộp bài.');
      return;
    }
    if (!selectedLesson) {
      alert('Vui lòng chọn một bài học.');
      return;
    }
    const fileInput = document.getElementById('assignmentFileInput');
    const file = fileInput?.files[0];

    if (file) {
      const lower = file.name.toLowerCase();
      if (!lower.endsWith('.pdf') && !lower.endsWith('.png') && !lower.endsWith('.jpg') && !lower.endsWith('.jpeg')) {
        alert(`Tệp tin "${file.name}" không hợp lệ!\n\nHệ thống chỉ cho phép nộp file định dạng PDF (.pdf) hoặc Hình ảnh (.png, .jpg, .jpeg). Vui lòng chuyển đổi sang PDF hoặc chụp ảnh bài làm.`);
        if (fileInput) fileInput.value = '';
        return;
      }
    }

    if (!answerText.trim() && !file) {
      alert('Vui lòng nhập lời giải hoặc tải lên file bài làm (PDF/Ảnh).');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('userId', currentUser.id);
      formData.append('lessonId', selectedLesson.id);
      if (answerText.trim()) formData.append('answerText', answerText);
      if (file) formData.append('answerFile', file);

      const res = await axios.post('http://localhost:8080/api/submissions', formData, {
        headers: {
          ...authHeader(),
          'Content-Type': 'multipart/form-data',
        },
      });

      const resData = res.data && res.data.result ? res.data.result : res.data;
      const submissionId = resData.id || resData.submissionId;

      if (submissionId) {
        navigate(`/submission/${submissionId}/result`);
      } else {
        alert('Nộp bài thành công! Hệ thống đang tiến hành chấm điểm.');
        setAnswerText('');
        if (fileInput) fileInput.value = '';
      }
    } catch (error) {
      console.error('Lỗi khi nộp bài:', error);
      const serverMsg = error.response?.data?.message;
      alert(serverMsg || 'Có lỗi xảy ra khi nộp bài. Vui lòng kiểm tra lại file đính kèm (chỉ nhận PDF hoặc Hình ảnh).');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '1.5rem auto', padding: '0 1rem' }}>
      {/* ── Top Page Header Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))',
        border: '1px solid var(--border-color)',
        borderRadius: '1.25rem',
        padding: '1.5rem 2rem',
        marginBottom: '1.75rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '2px 9px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600, color: '#a5b4fc', marginBottom: '0.4rem' }}>
            📚 Khóa Học & Luyện Tập Tự Luận
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--text-main)' }}>
            Danh Sách Bài Học & Đề Luyện Thi
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
            Chọn bài học từ danh sách bên dưới để tải tài liệu, làm bài và nhận kết quả chấm điểm AI chi tiết.
          </p>
        </div>
        <div style={{
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          padding: '0.6rem 1.25rem',
          borderRadius: '0.75rem',
          textAlign: 'center'
        }}>
          <span style={{ display: 'block', fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-color)' }}>
            {availableLessons.length}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Bài Học Khả Dụng
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        {/* Sidebar Danh Sách Bài Học */}
        <LessonSidebar
          availableLessons={availableLessons}
          selectedLesson={selectedLesson}
          onSelectLesson={handleSelectLesson}
        />

        {/* Main Content Pane */}
        <div style={{ flex: '2', minWidth: '320px' }}>
        {selectedLesson ? (
          <>
            {/* Chi Tiết Bài Học */}
            <LessonDetailCard
              selectedLesson={selectedLesson}
              currentUser={currentUser}
            />

            {/* Dành cho Learner: Form Nộp Bài */}
            {currentUser?.role !== 'ROLE_COURSE_PROVIDER' && (
              <LessonSubmitForm
                selectedLesson={selectedLesson}
                answerText={answerText}
                setAnswerText={setAnswerText}
                isSubmitting={isSubmitting}
                onSubmitAssignment={handleSubmitAssignment}
              />
            )}

            {/* Dành cho Course Provider: Quản lý bài nộp học sinh */}
            {currentUser?.role === 'ROLE_COURSE_PROVIDER' && (
              <LessonProviderSubmissions
                submissions={submissions}
                lessonFeedbacks={lessonFeedbacks}
              />
            )}
          </>
        ) : (
          <div style={{ background: 'var(--card-bg)', border: '1px dashed var(--border-color)', borderRadius: '1rem', padding: '4rem 2rem', textAlign: 'center' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>👈</span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Hãy chọn một bài học từ danh sách
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
              Chọn bài học bên trái để xem đề bài chi tiết, tài liệu đính kèm và làm bài tập.
            </p>
          </div>
        )}
      </div>
    </div>
  </div>
  );
};

export default LessonView;
