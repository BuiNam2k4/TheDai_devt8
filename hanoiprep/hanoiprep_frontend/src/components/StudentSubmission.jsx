import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import authHeader from '../services/auth-header';

const StudentSubmission = () => {
    const { id: lessonId } = useParams();
    const navigate = useNavigate();
    const { currentUser: user } = useContext(AuthContext);
    
    const [lesson, setLesson] = useState(null);
    const [answerText, setAnswerText] = useState('');
    const [answerFile, setAnswerFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchLesson = async () => {
            try {
                const response = await fetch(`http://localhost:8080/api/lessons/${lessonId}`, {
                    headers: authHeader(),
                });
                if (response.ok) {
                    const data = await response.json();
                    setLesson(data && data.result ? data.result : data);
                } else {
                    setError('Không thể tải bài học.');
                }
            } catch (err) {
                setError('Lỗi kết nối máy chủ.');
            }
        };
        fetchLesson();
    }, [lessonId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            setError('Bạn cần đăng nhập để nộp bài.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        const formData = new FormData();
        formData.append('userId', user.id);
        formData.append('lessonId', lessonId);
        if (answerText) formData.append('answerText', answerText);
        if (answerFile) formData.append('answerFile', answerFile);

        try {
            const response = await fetch('http://localhost:8080/api/submissions', {
                method: 'POST',
                headers: authHeader(),
                body: formData,
            });

            if (response.ok) {
                const json = await response.json();
                const result = json && json.result ? json.result : json;
                // Successfully submitted and graded
                navigate(`/submission/${result.id}/result`);
            } else {
                const errorData = await response.text();
                setError('Lỗi khi nộp bài: ' + errorData);
                setIsSubmitting(false);
            }
        } catch (err) {
            setError('Lỗi kết nối máy chủ.');
            setIsSubmitting(false);
        }
    };

    if (error && !lesson) {
        return <div className="p-8 text-center text-red-500">{error}</div>;
    }

    if (!lesson) {
        return <div className="p-8 text-center">Đang tải nội dung...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-6 mt-8 bg-white rounded-lg shadow-md border border-gray-100">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{lesson.title}</h1>
            <div className="flex items-center text-sm text-gray-500 mb-6 pb-6 border-b border-gray-200">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">{lesson.category}</span>
            </div>

            <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-100">
                <h3 className="text-xl font-semibold text-gray-700 mb-4">Nội dung đề bài:</h3>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{lesson.contentText}</p>
                {lesson.questionFileUrl && (
                    <div className="mt-4">
                        <a href={lesson.questionFileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium underline">
                            Xem tệp đính kèm đề bài
                        </a>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-lg font-medium text-gray-700 mb-3">Bài làm của bạn:</label>
                    <textarea
                        className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-700 shadow-sm"
                        rows="8"
                        placeholder="Nhập câu trả lời của bạn vào đây..."
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        required
                    ></textarea>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hoặc tải lên tệp bài làm (Tuỳ chọn):</label>
                    <input
                        type="file"
                        onChange={(e) => setAnswerFile(e.target.files[0])}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
                    />
                </div>

                {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full py-4 px-6 rounded-xl text-white font-bold text-lg shadow-lg transition-all transform ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-[1.02] hover:shadow-xl'}`}
                    >
                        {isSubmitting ? (
                            <div className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Đang chấm điểm tự động bằng AI...
                            </div>
                        ) : 'Nộp bài và Chấm điểm'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default StudentSubmission;
