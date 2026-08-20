import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import authHeader from '../services/auth-header';
import { AuthContext } from '../context/AuthContext';

// Import subcomponents
import ScoreHeaderCard from './submission-result/ScoreHeaderCard';
import QuestionGradingGroup from './submission-result/QuestionGradingGroup';
import SubmissionFeedbackSection from './submission-result/SubmissionFeedbackSection';
import GradingPendingView from './submission-result/GradingPendingView';

const SubmissionResult = () => {
  const { id } = useParams();
  const { currentUser } = useContext(AuthContext);

  const [submission, setSubmission] = useState(null);
  const [details, setDetails] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Feedback state
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [existingFeedback, setExistingFeedback] = useState(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccessMsg, setFeedbackSuccessMsg] = useState('');
  const [feedbackErrorMsg, setFeedbackErrorMsg] = useState('');

  useEffect(() => {
    let timer = null;

    const fetchResult = async () => {
      try {
        const subRes = await fetch(`http://localhost:8080/api/submissions/${id}`, {
          headers: authHeader(),
        });
        if (!subRes.ok) throw new Error('Không thể tải thông tin bài nộp.');
        const subJson = await subRes.json();
        const subData = subJson && subJson.result ? subJson.result : subJson;
        setSubmission(subData);

        if (subData.status === 'GRADED') {
          const detRes = await fetch(`http://localhost:8080/api/submissions/${id}/details`, {
            headers: authHeader(),
          });
          if (detRes.ok) {
            const detJson = await detRes.json();
            const detData = detJson && detJson.result ? detJson.result : detJson;
            setDetails(Array.isArray(detData) ? detData : []);
          }

          try {
            const fbRes = await fetch(`http://localhost:8080/api/feedbacks/submission/${id}`, {
              headers: authHeader(),
            });
            if (fbRes.ok && fbRes.status === 200) {
              const fbJson = await fbRes.json();
              const fbData = fbJson && fbJson.result ? fbJson.result : fbJson;
              if (fbData && fbData.id) {
                setExistingFeedback(fbData);
                setFeedbackComment(fbData.comment || '');
              }
            }
          } catch (fbErr) {
            console.error('Không thể kiểm tra feedback:', fbErr);
          }
        }

        setLoading(false);

        if (subData.status === 'PENDING_GRADING' || subData.status === 'PROCESSING') {
          timer = setTimeout(fetchResult, 2500);
        }
      } catch (err) {
        setError(err.message || 'Lỗi kết nối máy chủ.');
        setLoading(false);
      }
    };

    fetchResult();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  const handleSendFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackComment.trim() || !currentUser || !submission) return;

    setIsSubmittingFeedback(true);
    setFeedbackSuccessMsg('');
    setFeedbackErrorMsg('');

    try {
      const payload = {
        userId: currentUser.id,
        lessonId: submission.lesson?.id,
        submissionId: parseInt(id, 10),
        rating: 5,
        comment: feedbackComment.trim(),
      };

      const res = await fetch('http://localhost:8080/api/feedbacks', {
        method: 'POST',
        headers: {
          ...authHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Không thể gửi phản hồi.');
      }

      const fbJson = await res.json();
      const savedFb = fbJson && fbJson.result ? fbJson.result : fbJson;
      setExistingFeedback(savedFb);
      setFeedbackSuccessMsg('🎉 Phản hồi của bạn đã được ghi nhận và gửi đến giáo viên!');
    } catch (err) {
      setFeedbackErrorMsg(err.message || 'Có lỗi xảy ra khi gửi phản hồi.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const totalMaxScore = details.reduce((sum, d) => sum + (d.rubric?.maxScore || 0), 0);
  const isFallbackMode = details.length > 0 && details[0].rubric === null;

  const scorePercent = isFallbackMode
    ? ((submission?.totalScore || 0) / 10) * 100
    : totalMaxScore > 0
    ? ((submission?.totalScore || 0) / totalMaxScore) * 100
    : 0;

  const getScoreColor = (pct) => {
    if (pct >= 80) return '#22c55e';
    if (pct >= 60) return '#f59e0b';
    return '#ef4444';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: '48px', height: '48px', border: '4px solid var(--border-color)', borderTop: '4px solid var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--text-muted)' }}>Đang tải dữ liệu bài làm...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '2rem', background: '#fee2e2', borderRadius: '1rem', textAlign: 'center', color: '#dc2626' }}>
        <p>⚠️ {error}</p>
        <Link to="/learner/lessons" style={{ color: 'var(--primary-color)', marginTop: '1rem', display: 'inline-block' }}>← Trở lại</Link>
      </div>
    );
  }

  if (!submission) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Không tìm thấy kết quả.</div>;
  }

  if (submission.status === 'PENDING_GRADING' || submission.status === 'PROCESSING') {
    return <GradingPendingView />;
  }

  const displayScore = submission.totalScore ? submission.totalScore.toFixed(2) : '0';
  const displayMax = isFallbackMode ? '10' : totalMaxScore > 0 ? totalMaxScore.toFixed(0) : '10';
  const scoreColor = getScoreColor(scorePercent);

  const groupedDetails = details.reduce((acc, detail) => {
    const qNo = detail.rubric?.questionNo || 'Chi tiết bài làm';
    if (!acc[qNo]) acc[qNo] = [];
    acc[qNo].push(detail);
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: '880px', margin: '2rem auto', padding: '1.5rem' }}>
      {/* Header điểm tổng */}
      <ScoreHeaderCard
        submission={submission}
        displayScore={displayScore}
        displayMax={displayMax}
        scorePercent={scorePercent}
        scoreColor={scoreColor}
      />

      {/* Chi tiết từng câu hỏi & rubric */}
      <QuestionGradingGroup
        groupedDetails={groupedDetails}
        overallScorePercent={scorePercent}
      />

      {/* Phản hồi / Báo lỗi */}
      <SubmissionFeedbackSection
        currentUser={currentUser}
        existingFeedback={existingFeedback}
        submission={submission}
        isFeedbackOpen={isFeedbackOpen}
        setIsFeedbackOpen={setIsFeedbackOpen}
        feedbackComment={feedbackComment}
        setFeedbackComment={setFeedbackComment}
        isSubmittingFeedback={isSubmittingFeedback}
        feedbackSuccessMsg={feedbackSuccessMsg}
        feedbackErrorMsg={feedbackErrorMsg}
        handleSendFeedback={handleSendFeedback}
      />

      {/* Footer Back Button */}
      <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
        <Link
          to="/learner/lessons"
          style={{
            display: 'inline-block',
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            padding: '0.75rem 2rem',
            borderRadius: '0.75rem',
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'background 0.2s',
          }}
        >
          ← Trở lại danh sách bài học
        </Link>
      </div>
    </div>
  );
};

export default SubmissionResult;
