import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import authHeader from '../services/auth-header';

const LessonUpload = () => {
  const { currentUser } = useContext(AuthContext);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDescription, setLessonDescription] = useState('');
  const [currentQuestionFile, setCurrentQuestionFile] = useState(null);
  const [currentSolutionFile, setCurrentSolutionFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { rubricCount, rubricStatus }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      alert('Please login first.');
      return;
    }
    if (!currentQuestionFile || !currentSolutionFile) {
      alert('Vui lòng tải lên cả file Đề bài và file Đáp án.');
      return;
    }

    setIsSubmitting(true);
    setResult(null);

    try {
      const lessonFormData = new FormData();
      lessonFormData.append('title', lessonTitle);
      lessonFormData.append('category', 'General');
      lessonFormData.append('contentText', lessonDescription);
      lessonFormData.append('providerId', currentUser.id);

      const materialInput = document.getElementById('lessonMaterialInput');
      if (materialInput?.files[0]) {
        lessonFormData.append('materialFile', materialInput.files[0]);
      }
      lessonFormData.append('questionFile', currentQuestionFile);
      lessonFormData.append('solutionFile', currentSolutionFile);

      const res = await axios.post('http://localhost:8080/api/lessons', lessonFormData, {
        headers: authHeader()
      });

      const resData = res.data && res.data.result ? res.data.result : res.data;
      const { rubricCount, rubricStatus } = resData || {};
      setResult({ rubricCount, rubricStatus });

      // Reset form
      setLessonTitle('');
      setLessonDescription('');
      setCurrentQuestionFile(null);
      setCurrentSolutionFile(null);
      if (materialInput) materialInput.value = '';
      document.getElementById('questionFileInput').value = '';
      document.getElementById('solutionFileInput').value = '';
    } catch (error) {
      console.error(error);
      const errorData = error.response?.data;
      const errorMessage = typeof errorData === 'object' ? JSON.stringify(errorData) : (errorData || error.message);
      alert('Error uploading lesson: ' + errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-card">
        <h2 className="admin-title">Upload Lesson</h2>

        {/* Success result */}
        {result && (
          <div style={{
            background: result.rubricStatus === 'auto_generated'
              ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            border: `1px solid ${result.rubricStatus === 'auto_generated' ? 'var(--success)' : '#f59e0b'}`,
            borderRadius: '0.75rem',
            padding: '1.25rem',
            marginBottom: '1.5rem'
          }}>
            {result.rubricStatus === 'auto_generated' ? (
              <>
                <p style={{ color: 'var(--success)', fontWeight: 600, marginBottom: '0.25rem' }}>
                  ✅ Bài học đã được tạo thành công!
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  🤖 AI đã phân tích file đáp án và tự động tạo <strong style={{ color: 'var(--success)' }}>{result.rubricCount} tiêu chí chấm điểm</strong>.
                  Học viên có thể nộp bài và nhận điểm ngay.
                </p>
              </>
            ) : (
              <>
                <p style={{ color: '#f59e0b', fontWeight: 600, marginBottom: '0.25rem' }}>
                  ⚠️ Bài học đã được tạo thành công
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Hệ thống đã thiết lập thang điểm đánh giá tổng thể cho bài học.
                </p>
              </>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* ── Thông tin bài học ── */}
          <div className="form-group">
            <label>Lesson Title <span style={{ color: 'red' }}>*</span></label>
            <input
              type="text"
              className="form-control"
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              required
              placeholder="Enter lesson title..."
            />
          </div>

          <div className="form-group">
            <label>Lesson Description (Optional)</label>
            <textarea
              className="form-control"
              rows="3"
              value={lessonDescription}
              onChange={(e) => setLessonDescription(e.target.value)}
              placeholder="Enter lesson description..."
            />
          </div>

          <div className="form-group">
            <label>Upload Lesson Materials (PDF, Optional)</label>
            <input id="lessonMaterialInput" type="file" accept="application/pdf" className="form-control" />
          </div>

          <hr style={{ borderColor: 'var(--border-color)', margin: '2rem 0' }} />

          {/* ── Files đề bài & đáp án ── */}
          <h3 style={{ marginBottom: '0.5rem' }}>Assignment Files</h3>

          <div style={{
            background: 'rgba(99, 102, 241, 0.06)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '0.75rem',
            padding: '1rem 1.25rem',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            lineHeight: 1.6
          }}>
            🤖 <strong style={{ color: 'var(--primary-color)' }}>AI sẽ tự động phân tích file Đáp án</strong> để tạo ra tiêu chí chấm điểm (rubric).
            File đáp án cần là <strong>PDF văn bản</strong> (không phải scan) để AI đọc được nội dung.
          </div>

          <div className="form-group" style={{ background: 'var(--input-bg)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
            <label style={{ marginBottom: '0.5rem', display: 'block' }}>
              📋 Upload Question File (PDF) <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              id="questionFileInput"
              type="file"
              accept="application/pdf"
              className="form-control"
              onChange={(e) => setCurrentQuestionFile(e.target.files[0])}
              style={{ marginBottom: '1.25rem' }}
              required
            />

            <label style={{ marginBottom: '0.5rem', display: 'block' }}>
              ✅ Upload Answer / Solution File (PDF) <span style={{ color: 'red' }}>*</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--primary-color)', marginLeft: '0.5rem' }}>
                — AI sẽ đọc file này để tạo rubric
              </span>
            </label>
            <input
              id="solutionFileInput"
              type="file"
              accept="application/pdf"
              className="form-control"
              onChange={(e) => setCurrentSolutionFile(e.target.files[0])}
              required
            />
          </div>

          <button
            type="submit"
            className="auth-btn"
            disabled={isSubmitting}
            style={{ marginTop: '2rem', opacity: isSubmitting ? 0.75 : 1 }}
          >
            {isSubmitting ? (
              <>
                <span className="spinner" style={{ marginRight: '0.5rem' }} />
                🤖 AI đang phân tích đáp án và tạo rubric...
              </>
            ) : '🚀 Submit Lesson'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LessonUpload;
