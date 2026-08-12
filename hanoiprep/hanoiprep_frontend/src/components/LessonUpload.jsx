import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import authHeader from '../services/auth-header';

const LessonUpload = () => {
  const { currentUser } = useContext(AuthContext);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDescription, setLessonDescription] = useState('');
  const [questions, setQuestions] = useState([]);
  const [currentQuestionFile, setCurrentQuestionFile] = useState(null);
  const [currentSolutionFile, setCurrentSolutionFile] = useState(null);

  const handleAddQuestion = () => {
    if (!currentQuestionFile) {
      alert("Bạn phải tải lên file Đề bài (PDF).");
      return;
    }
    if (!currentSolutionFile) {
      alert("Bạn phải tải lên file Hướng dẫn giải / Đáp án (PDF) cho AI.");
      return;
    }
    
    setQuestions([...questions, { 
      fileName: currentQuestionFile.name,
      file: currentQuestionFile,
      solutionFileName: currentSolutionFile.name,
      solutionFile: currentSolutionFile
    }]);
    
    setCurrentQuestionFile(null);
    setCurrentSolutionFile(null);
    // Reset file input
    document.getElementById('questionFileInput').value = '';
    const solFileInput = document.getElementById('solutionFileInput');
    if (solFileInput) solFileInput.value = '';
  };

  const handleRemoveQuestion = (index) => {
    const newQuestions = [...questions];
    newQuestions.splice(index, 1);
    setQuestions(newQuestions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      alert("Please login first.");
      return;
    }

    try {
      // 1. Upload Lesson
      const lessonFormData = new FormData();
      lessonFormData.append('title', lessonTitle);
      lessonFormData.append('category', 'General'); // Default or could be added to state
      lessonFormData.append('contentText', lessonDescription);
      lessonFormData.append('providerId', currentUser.id);
      
      const materialInput = document.getElementById('lessonMaterialInput');
      if (materialInput.files[0]) {
        lessonFormData.append('materialFile', materialInput.files[0]);
      }

      const lessonRes = await axios.post('http://localhost:8080/api/knowledge-base', lessonFormData, {
        headers: authHeader()
      });
      const kbId = lessonRes.data.id;

      // 2. Upload Questions
      for (const q of questions) {
        const qFormData = new FormData();
        qFormData.append('knowledgeBaseId', kbId);
        if (q.file) qFormData.append('questionFile', q.file);
        if (q.solutionFile) qFormData.append('solutionFile', q.solutionFile);

        await axios.post('http://localhost:8080/api/questions', qFormData, {
          headers: authHeader()
        });
      }

      alert("Lesson uploaded successfully!");
      setLessonTitle('');
      setLessonDescription('');
      setQuestions([]);
      if (materialInput) materialInput.value = '';
    } catch (error) {
      console.error(error);
      alert("Error uploading lesson: " + (error.response?.data || error.message));
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-card">
        <h2 className="admin-title">Upload Lesson & Create Questions</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Lesson Title</label>
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
              rows="4"
              value={lessonDescription} 
              onChange={(e) => setLessonDescription(e.target.value)} 
              placeholder="Enter lesson description..."
            />
          </div>

          <div className="form-group">
            <label>Upload Lesson Materials (PDF)</label>
            <input id="lessonMaterialInput" type="file" accept="application/pdf" className="form-control" />
          </div>

          <hr style={{ borderColor: 'var(--border-color)', margin: '2rem 0' }} />

          <h3 style={{ marginBottom: '1rem' }}>Create Assignment / Questions (Essay)</h3>
          
          <div className="form-group" style={{ background: 'var(--input-bg)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
            
            <label>Upload Question File (PDF) <span style={{color: 'red'}}>*</span></label>
            <input 
              id="questionFileInput"
              type="file" 
              accept="application/pdf"
              className="form-control" 
              onChange={(e) => setCurrentQuestionFile(e.target.files[0])}
              style={{ marginBottom: '1rem' }}
            />

            <label>Upload Solution File (PDF) - Dành cho AI chấm <span style={{color: 'red'}}>*</span></label>
            <input 
              id="solutionFileInput"
              type="file" 
              accept="application/pdf"
              className="form-control" 
              onChange={(e) => setCurrentSolutionFile(e.target.files[0])}
              style={{ marginBottom: '1rem' }}
            />
            
            <button type="button" className="btn btn-primary" onClick={handleAddQuestion}>
              Add Question
            </button>
          </div>

          {questions.length > 0 && (
            <div className="form-group">
              <label>Questions List</label>
              <ul style={{ listStyleType: 'none', padding: 0 }}>
                {questions.map((q, idx) => (
                  <li key={idx} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    background: 'var(--input-bg)', 
                    padding: '1rem', 
                    borderRadius: '0.5rem',
                    marginBottom: '0.75rem',
                    borderLeft: '4px solid var(--primary-color)'
                  }}>
                    <div>
                      <strong style={{ color: 'var(--primary-color)' }}>Question {idx + 1}:</strong>
                      {q.fileName && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--success)' }}>
                          📎 Question File: {q.fileName}
                        </div>
                      )}
                      {q.solutionFileName && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--success)' }}>
                          📎 Solution File: {q.solutionFileName}
                        </div>
                      )}
                    </div>
                    <button type="button" className="btn-delete" onClick={() => handleRemoveQuestion(idx)}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button type="submit" className="auth-btn" style={{ marginTop: '2rem' }}>
            Submit Lesson
          </button>
        </form>
      </div>
    </div>
  );
};

export default LessonUpload;
