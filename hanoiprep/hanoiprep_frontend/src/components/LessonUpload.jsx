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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      alert("Please login first.");
      return;
    }

    if (!currentQuestionFile || !currentSolutionFile) {
      alert("Vui lòng tải lên cả file Đề bài và file Hướng dẫn giải.");
      return;
    }

    try {
      const lessonFormData = new FormData();
      lessonFormData.append('title', lessonTitle);
      lessonFormData.append('category', 'General');
      lessonFormData.append('contentText', lessonDescription);
      lessonFormData.append('providerId', currentUser.id);
      
      const materialInput = document.getElementById('lessonMaterialInput');
      if (materialInput.files[0]) {
        lessonFormData.append('materialFile', materialInput.files[0]);
      }
      lessonFormData.append('questionFile', currentQuestionFile);
      lessonFormData.append('solutionFile', currentSolutionFile);

      console.log('Sending request with headers:', authHeader());

      await axios.post('http://localhost:8080/api/lessons', lessonFormData, {
        headers: authHeader()
      });

      alert("Lesson uploaded successfully!");
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
      alert("Error uploading lesson: " + errorMessage);
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-card">
        <h2 className="admin-title">Upload Lesson</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Lesson Title <span style={{color: 'red'}}>*</span></label>
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

          <h3 style={{ marginBottom: '1rem' }}>Assignment / Exercise</h3>
          
          <div className="form-group" style={{ background: 'var(--input-bg)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
            
            <label>Upload Question File (PDF) <span style={{color: 'red'}}>*</span></label>
            <input 
              id="questionFileInput"
              type="file" 
              accept="application/pdf"
              className="form-control" 
              onChange={(e) => setCurrentQuestionFile(e.target.files[0])}
              style={{ marginBottom: '1rem' }}
              required
            />

            <label>Upload Solution File (PDF) - Dành cho AI chấm <span style={{color: 'red'}}>*</span></label>
            <input 
              id="solutionFileInput"
              type="file" 
              accept="application/pdf"
              className="form-control" 
              onChange={(e) => setCurrentSolutionFile(e.target.files[0])}
              style={{ marginBottom: '1rem' }}
              required
            />
          </div>

          <button type="submit" className="auth-btn" style={{ marginTop: '2rem' }}>
            Submit Lesson
          </button>
        </form>
      </div>
    </div>
  );
};

export default LessonUpload;
