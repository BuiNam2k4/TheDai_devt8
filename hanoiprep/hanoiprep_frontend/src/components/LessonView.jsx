import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import authHeader from '../services/auth-header';

const LessonView = () => {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [availableLessons, setAvailableLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [lessonFeedbacks, setLessonFeedbacks] = useState([]);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answerText, setAnswerText] = useState('');

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      const res = await axios.get('http://localhost:8080/api/lessons', { headers: authHeader() });
      const lessonsData = res.data && res.data.result ? res.data.result : res.data;
      
      // Filter lessons: only show if they have both question and solution files
      const validLessons = (Array.isArray(lessonsData) ? lessonsData : []).filter(
        lesson => lesson.questionFileUrl && lesson.solutionFileUrl
      );
      
      setAvailableLessons(validLessons);
    } catch (error) {
      console.error("Error fetching lessons", error);
    }
  };

  const handleSelectLesson = async (lesson) => {
    setSelectedLesson(lesson);
    if (currentUser?.role === 'ROLE_COURSE_PROVIDER') {
      try {
        const subRes = await axios.get(`http://localhost:8080/api/submissions/lesson/${lesson.id}`, { headers: authHeader() });
        const subsData = subRes.data && subRes.data.result ? subRes.data.result : subRes.data;
        setSubmissions(Array.isArray(subsData) ? subsData : []);
      } catch (error) {
        console.error("Error fetching submissions", error);
      }

      try {
        const fbRes = await axios.get(`http://localhost:8080/api/feedbacks/lesson/${lesson.id}`, { headers: authHeader() });
        const fbsData = fbRes.data && fbRes.data.result ? fbRes.data.result : fbRes.data;
        setLessonFeedbacks(Array.isArray(fbsData) ? fbsData : []);
      } catch (error) {
        console.error("Error fetching feedbacks", error);
      }
    }
    setSelectedPdfUrl(null);
  };

  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      alert("Please login first.");
      return;
    }
    if (!selectedLesson) {
      alert("No lesson selected.");
      return;
    }
    const fileInput = document.getElementById('assignmentFileInput');
    const hasFile = fileInput && fileInput.files && fileInput.files[0];
    const hasText = answerText && answerText.trim().length > 0;

    if (!hasText && !hasFile) {
      alert("Vui lòng nhập bài làm văn bản HOẶC tải lên file PDF bài làm trước khi nộp.");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('userId', currentUser.id);
      formData.append('lessonId', selectedLesson.id);
      formData.append('answerText', answerText.trim());

      const fileInput = document.getElementById('assignmentFileInput');
      if (fileInput && fileInput.files[0]) {
        formData.append('answerFile', fileInput.files[0]);
      }

      const res = await axios.post('http://localhost:8080/api/submissions', formData, {
        headers: authHeader()
      });

      // Navigate đến trang kết quả chấm điểm AI
      const subData = res.data && res.data.result ? res.data.result : res.data;
      const submissionId = subData?.id;
      if (submissionId) {
        navigate(`/submission/${submissionId}/result`);
      } else {
        alert("Nộp bài thành công! Đang tải kết quả...");
        window.location.reload();
      }
    } catch (error) {
      console.error("Error submitting assignment", error);
      alert("Error submitting assignment: " + (error.response?.data || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      // Force it to be a PDF type
      const blobUrl = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename || 'document.pdf');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error("Error downloading file:", error);
      window.open(url, '_blank'); // fallback
    }
  };

  return (
    <div className="admin-container" style={{ display: 'flex', gap: '2rem', maxWidth: '1200px' }}>
      
      {/* Sidebar for Lessons */}
      <div className="admin-card" style={{ flex: '1' }}>
        <h2 className="admin-title">Available Lessons</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {availableLessons.map((lesson) => (
            <div 
              key={lesson.id} 
              style={{
                padding: '1rem',
                background: selectedLesson?.id === lesson.id ? 'var(--primary-color)' : 'var(--input-bg)',
                borderRadius: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: '1px solid var(--border-color)'
              }}
              onClick={() => handleSelectLesson(lesson)}
            >
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{lesson.title}</h3>
              <p style={{ fontSize: '0.9rem', color: selectedLesson?.id === lesson.id ? 'white' : 'var(--text-muted)' }}>
                {lesson.contentText || lesson.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="admin-card" style={{ flex: '2' }}>
        {selectedLesson ? (
          <div>
            <h2 className="admin-title">{selectedLesson.title}</h2>
            {(selectedLesson.contentText || selectedLesson.description || selectedLesson.materialFileUrl) && (
              <div style={{ marginBottom: '2rem', padding: '1rem', background: 'var(--input-bg)', borderRadius: '0.75rem' }}>
                {(selectedLesson.contentText || selectedLesson.description) && (
                  <p style={{ color: 'var(--text-muted)' }}>{selectedLesson.contentText || selectedLesson.description}</p>
                )}
                {selectedLesson.materialFileUrl && (
                  <div style={{ marginTop: '1rem' }}>
                    <a href="#" onClick={(e) => { e.preventDefault(); handleDownload(selectedLesson.materialFileUrl, 'TaiLieu.pdf'); }} style={{ color: 'var(--primary-color)', textDecoration: 'underline' }}>
                      📎 Tải Tài Liệu Bài Học (PDF)
                    </a>
                  </div>
                )}
              </div>
            )}

            <hr style={{ borderColor: 'var(--border-color)', margin: '2rem 0' }} />

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Assignment / Exercise</h3>
              <div style={{ 
                background: 'var(--input-bg)', 
                padding: '1rem', 
                borderRadius: '0.5rem',
                borderLeft: '4px solid var(--primary-color)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedLesson.questionFileUrl && (
                    <div>
                      <a href="#" onClick={(e) => { e.preventDefault(); handleDownload(selectedLesson.questionFileUrl, 'DeBai.pdf'); }} style={{ color: 'var(--success)', textDecoration: 'underline', fontSize: '0.9rem' }}>
                        📎 Tải Đề Bài (PDF)
                      </a>
                    </div>
                  )}
                  {selectedLesson.solutionFileUrl && currentUser?.role === 'ROLE_COURSE_PROVIDER' && (
                    <div>
                      <a href="#" onClick={(e) => { e.preventDefault(); handleDownload(selectedLesson.solutionFileUrl, 'DapAn.pdf'); }} style={{ color: 'var(--success)', textDecoration: 'underline', fontSize: '0.9rem' }}>
                        📎 Tải Đáp Án / Hướng Dẫn Giải (Dành cho Provider)
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {currentUser?.role !== 'ROLE_COURSE_PROVIDER' && currentUser?.role !== 'ROLE_ADMIN' && (
              <>
                <h3 style={{ marginBottom: '0.5rem' }}>Submit Answer</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  🤖 Sau khi nộp bài, AI sẽ tự động chấm điểm và hiển thị kết quả.
                </p>
                <form onSubmit={handleSubmitAssignment}>
                  <div className="form-group">
                    <label>Bài làm văn bản (Tùy chọn)</label>
                    <textarea
                      className="form-control"
                      rows="6"
                      placeholder="Nhập bài làm của bạn vào đây (hoặc đính kèm file PDF bài làm ở dưới)..."
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Tải lên file bài làm (Tùy chọn – PDF)</label>
                    <input id="assignmentFileInput" type="file" accept=".pdf,image/*" className="form-control" />
                  </div>

                  <button
                    type="submit"
                    className="auth-btn"
                    disabled={isSubmitting}
                    style={{ opacity: isSubmitting ? 0.75 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                  >
                    {isSubmitting
                      ? '🤖 AI đang chấm bài... Vui lòng chờ'
                      : '📤 Nộp bài & Chấm điểm AI'}
                  </button>
                </form>
              </>
            )}

            {currentUser?.role === 'ROLE_COURSE_PROVIDER' && (
              <>
                <div style={{ marginTop: '2.5rem' }}>
                  <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    📥 Student Submissions ({submissions.length})
                  </h3>
                  {submissions.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {submissions.map(sub => (
                        <div key={sub.id} style={{ background: 'var(--input-bg)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                          <p><strong>Học viên:</strong> {sub.user?.username || sub.user?.id || 'Unknown'}</p>
                          <p><strong>Thời gian nộp:</strong> {new Date(sub.createdAt).toLocaleString('vi-VN')}</p>
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                            {sub.answerFileUrl && (
                              <button onClick={() => handleDownload(sub.answerFileUrl, `Submission_${sub.id}`)} style={{ background: 'var(--primary-color)', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                📎 Tải File Bài Làm
                              </button>
                            )}
                            <button onClick={() => navigate(`/submission/${sub.id}/result`)} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.4rem 0.8rem', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                              🔍 Xem Kết Quả Chấm AI
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)' }}>Chưa có bài nộp nào.</p>
                  )}
                </div>

                {/* Danh sách Feedback của bài học này */}
                <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                  <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    💬 Phản Hồi Từ Học Viên Cho Bài Học Này ({lessonFeedbacks.length})
                  </h3>
                  {lessonFeedbacks.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {lessonFeedbacks.map(fb => (
                        <div key={fb.id} style={{ background: 'var(--input-bg)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.25rem' }}>
                            <strong>👤 {fb.user?.username || 'Học viên'} ({fb.user?.gmail || 'N/A'})</strong>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {fb.createdAt ? new Date(fb.createdAt).toLocaleString('vi-VN') : ''}
                            </span>
                          </div>
                          <div style={{ background: 'var(--card-bg)', padding: '0.85rem', borderRadius: '0.5rem', fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5, borderLeft: '3px solid var(--primary-color)' }}>
                            {fb.comment}
                          </div>
                          {fb.submission && (
                            <div style={{ marginTop: '0.5rem', textAlign: 'right' }}>
                              <button onClick={() => navigate(`/submission/${fb.submission.id}/result`)} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}>
                                Xem bài nộp liên quan →
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)' }}>Chưa có phản hồi nào cho bài học này.</p>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
            <p>Select a lesson from the list to view its contents and submit your assignment.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default LessonView;
