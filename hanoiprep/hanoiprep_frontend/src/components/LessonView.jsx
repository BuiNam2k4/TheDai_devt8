import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import authHeader from '../services/auth-header';

const LessonView = () => {
  const { currentUser } = useContext(AuthContext);
  const [availableLessons, setAvailableLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [assignmentText, setAssignmentText] = useState('');

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      const res = await axios.get('http://localhost:8080/api/knowledge-base', { headers: authHeader() });
      setAvailableLessons(res.data);
    } catch (error) {
      console.error("Error fetching lessons", error);
    }
  };

  const handleSelectLesson = (lesson) => {
    setSelectedLesson(lesson);
    setAssignmentText('');
  };

  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      alert("Please login first.");
      return;
    }
    if (!selectedLesson || !selectedLesson.questions || selectedLesson.questions.length === 0) {
      alert("No questions found in this lesson to submit for.");
      return;
    }

    try {
      // Assuming we submit for the first question in the lesson for simplicity,
      // or we could loop and submit multiple. Usually it's one submission per question.
      const qId = selectedLesson.questions[0].id;
      
      const formData = new FormData();
      formData.append('userId', currentUser.id);
      formData.append('questionId', qId);
      if (assignmentText) {
        formData.append('answerText', assignmentText);
      }

      const fileInput = document.getElementById('assignmentFileInput');
      if (fileInput && fileInput.files[0]) {
        formData.append('answerFile', fileInput.files[0]);
      }

      await axios.post('http://localhost:8080/api/submissions', formData, {
        headers: authHeader()
      });

      alert("Assignment submitted successfully!");
      setAssignmentText('');
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error("Error submitting assignment", error);
      alert("Error submitting assignment: " + (error.response?.data || error.message));
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
            <div style={{ marginBottom: '2rem', padding: '1rem', background: 'var(--input-bg)', borderRadius: '0.75rem' }}>
              <p style={{ color: 'var(--text-muted)' }}>{selectedLesson.contentText || selectedLesson.description}</p>
              {selectedLesson.materialFileUrl && (
                <div style={{ marginTop: '1rem' }}>
                  <a href={selectedLesson.materialFileUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'underline' }}>
                    Download Material (PDF)
                  </a>
                </div>
              )}
            </div>

            <hr style={{ borderColor: 'var(--border-color)', margin: '2rem 0' }} />

            {selectedLesson.questions && selectedLesson.questions.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Assignment Questions</h3>
                <ul style={{ listStyleType: 'none', padding: 0 }}>
                  {selectedLesson.questions.map((q, idx) => (
                    <li key={idx} style={{ 
                      background: 'var(--input-bg)', 
                      padding: '1rem', 
                      borderRadius: '0.5rem',
                      marginBottom: '0.75rem',
                      borderLeft: '4px solid var(--primary-color)'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div>
                          <strong style={{ color: 'var(--primary-color)', marginRight: '0.5rem' }}>Question {idx + 1}:</strong> 
                          {q.contentLatex && <span>{q.contentLatex}</span>}
                        </div>
                        {q.questionFileUrl && (
                          <div>
                            <a href={q.questionFileUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--success)', textDecoration: 'underline', fontSize: '0.9rem' }}>
                              📎 Download Attachment
                            </a>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <h3 style={{ marginBottom: '1rem' }}>Submit Answer (Essay)</h3>
            <form onSubmit={handleSubmitAssignment}>
              <div className="form-group">
                <label>Upload Assignment File (PDF)</label>
                <input id="assignmentFileInput" type="file" accept="application/pdf" className="form-control" />
              </div>

              <div className="form-group">
                <label>Or Write Answer Here</label>
                <textarea 
                  className="form-control" 
                  rows="5"
                  value={assignmentText}
                  onChange={(e) => setAssignmentText(e.target.value)}
                  placeholder="Type your answer..."
                />
              </div>

              <button type="submit" className="auth-btn">
                Submit Work
              </button>
            </form>
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
