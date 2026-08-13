import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import authHeader from '../services/auth-header';

const LessonView = () => {
  const { currentUser } = useContext(AuthContext);
  const [availableLessons, setAvailableLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      const res = await axios.get('http://localhost:8080/api/lessons', { headers: authHeader() });
      
      // Filter lessons: only show if they have both question and solution files
      const validLessons = res.data.filter(lesson => lesson.questionFileUrl && lesson.solutionFileUrl);
      
      setAvailableLessons(validLessons);
    } catch (error) {
      console.error("Error fetching lessons", error);
    }
  };

  const handleSelectLesson = async (lesson) => {
    setSelectedLesson(lesson);
    if (currentUser?.role === 'ROLE_COURSE_PROVIDER') {
      try {
        const res = await axios.get(`http://localhost:8080/api/submissions/lesson/${lesson.id}`, { headers: authHeader() });
        setSubmissions(res.data);
      } catch (error) {
        console.error("Error fetching submissions", error);
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

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('userId', currentUser.id);
      formData.append('lessonId', selectedLesson.id);

      const fileInput = document.getElementById('assignmentFileInput');
      if (fileInput && fileInput.files[0]) {
        formData.append('answerFile', fileInput.files[0]);
      }

      await axios.post('http://localhost:8080/api/submissions', formData, {
        headers: authHeader()
      });

      alert("Assignment submitted successfully!");
      if (fileInput) fileInput.value = '';
      window.location.reload(); // Reset page luôn
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
                <h3 style={{ marginBottom: '1rem' }}>Submit Answer</h3>
                <form onSubmit={handleSubmitAssignment}>
                  <div className="form-group">
                    <label>Upload Assignment File (PDF or Image)</label>
                    <input id="assignmentFileInput" type="file" accept=".pdf,image/*" className="form-control" required />
                  </div>

                  <button type="submit" className="auth-btn" disabled={isSubmitting} style={{ opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
                    {isSubmitting ? 'Đang nộp bài...' : 'Submit Work'}
                  </button>
                </form>
              </>
            )}

            {currentUser?.role === 'ROLE_COURSE_PROVIDER' && (
              <div style={{ marginTop: '3rem' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>Student Submissions</h3>
                {submissions.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {submissions.map(sub => (
                      <div key={sub.id} style={{ background: 'var(--input-bg)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                        <p><strong>User ID:</strong> {sub.user?.username || sub.user?.id || 'Unknown'}</p>
                        <p><strong>Submitted At:</strong> {new Date(sub.createdAt).toLocaleString()}</p>
                        {sub.answerFileUrl && (
                          <button onClick={() => handleDownload(sub.answerFileUrl, `Submission_${sub.id}`)} style={{ marginTop: '0.5rem', background: 'var(--primary-color)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.25rem', cursor: 'pointer' }}>
                            Download File
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)' }}>No submissions yet.</p>
                )}
              </div>
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
