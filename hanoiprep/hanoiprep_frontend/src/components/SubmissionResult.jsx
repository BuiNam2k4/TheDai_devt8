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

  // Retry grading state (for 3.1)
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');

  // Teacher grade edit state (for 3.2)
  const [isEditingGrades, setIsEditingGrades] = useState(false);
  const [editedScores, setEditedScores] = useState({});
  const [editedFeedbacks, setEditedFeedbacks] = useState({});
  const [isSavingGrades, setIsSavingGrades] = useState(false);
  const [gradeSaveSuccess, setGradeSaveSuccess] = useState('');
  const [gradeSaveError, setGradeSaveError] = useState('');

  const isInstructor =
    currentUser &&
    (currentUser.role === 'ROLE_COURSE_PROVIDER' || currentUser.role === 'ROLE_ADMIN');

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

        if (subData.status === 'GRADED' || subData.status === 'GRADING_FAILED') {
          const detRes = await fetch(`http://localhost:8080/api/submissions/${id}/details`, {
            headers: authHeader(),
          });
          if (detRes.ok) {
            const detJson = await detRes.json();
            const detData = detJson && detJson.result ? detJson.result : detJson;
            const detArray = Array.isArray(detData) ? detData : [];
            setDetails(detArray);

            // Initialize edit state
            const scoresMap = {};
            const feedbacksMap = {};
            detArray.forEach((d) => {
              scoresMap[d.id] = d.awardedScore ?? 0;
              feedbacksMap[d.id] = d.aiFeedback ?? '';
            });
            setEditedScores(scoresMap);
            setEditedFeedbacks(feedbacksMap);
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

  const handleRetryGrading = async () => {
    setIsRetrying(true);
    setRetryError('');
    try {
      const res = await fetch(`http://localhost:8080/api/submissions/${id}/grade`, {
        method: 'POST',
        headers: authHeader(),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Không thể chấm lại bài.');
      }
      setLoading(true);
      setSubmission((prev) => prev ? { ...prev, status: 'PENDING_GRADING' } : prev);
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      setRetryError(err.message || 'Lỗi khi yêu cầu chấm lại.');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleStartEditGrades = () => {
    const scoresMap = {};
    const feedbacksMap = {};
    details.forEach((d) => {
      scoresMap[d.id] = d.awardedScore ?? 0;
      feedbacksMap[d.id] = d.aiFeedback ?? '';
    });
    setEditedScores(scoresMap);
    setEditedFeedbacks(feedbacksMap);
    setGradeSaveSuccess('');
    setGradeSaveError('');
    setIsEditingGrades(true);
  };

  const handleCancelEditGrades = () => {
    setIsEditingGrades(false);
    setGradeSaveError('');
  };

  const handleScoreChange = (detailId, val) => {
    setEditedScores((prev) => ({
      ...prev,
      [detailId]: val,
    }));
  };

  const handleFeedbackChange = (detailId, val) => {
    setEditedFeedbacks((prev) => ({
      ...prev,
      [detailId]: val,
    }));
  };

  const handleSaveGrades = async () => {
    setIsSavingGrades(true);
    setGradeSaveSuccess('');
    setGradeSaveError('');

    // 1. Kiểm tra tính hợp lệ của toàn bộ điểm số trước khi gửi
    for (const d of details) {
      const rawVal = editedScores[d.id];
      const score = parseFloat(rawVal);
      const maxScore = d.rubric?.maxScore || 10.0;

      if (rawVal === undefined || rawVal === '' || isNaN(score) || score < 0) {
        setGradeSaveError(`⚠️ Điểm của "${d.rubric?.questionNo || 'Tiêu chí'}" không được để trống hoặc âm. Vui lòng nhập số hợp lệ!`);
        setIsSavingGrades(false);
        return;
      }

      if (d.rubric && score > maxScore) {
        setGradeSaveError(
          `⚠️ Điểm của "${d.rubric.questionNo || 'Câu'} - Bước ${d.rubric.stepOrder || ''}" (${score} điểm) vượt quá điểm tối đa (${maxScore} điểm). Vui lòng điều chỉnh lại!`
        );
        setIsSavingGrades(false);
        return;
      }
    }

    try {
      const updateDetails = details.map((d) => ({
        detailId: d.id,
        rubricId: d.rubric?.id,
        awardedScore: parseFloat(editedScores[d.id]) || 0,
        feedback: editedFeedbacks[d.id] || '',
      }));

      const payload = {
        details: updateDetails,
      };

      const res = await fetch(`http://localhost:8080/api/submissions/${id}/grades`, {
        method: 'PUT',
        headers: {
          ...authHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        let serverMessage = 'Không thể lưu điểm đã chỉnh sửa.';
        try {
          const errObj = JSON.parse(errText);
          if (errObj && errObj.message) serverMessage = errObj.message;
        } catch (_) {
          if (errText) serverMessage = errText;
        }
        throw new Error(serverMessage);
      }

      const resJson = await res.json();
      const updatedSub = resJson && resJson.result ? resJson.result : resJson;
      setSubmission(updatedSub);

      // Cập nhật lại danh sách details
      setDetails((prev) =>
        prev.map((d) => ({
          ...d,
          awardedScore: parseFloat(editedScores[d.id]) || 0,
          aiFeedback: editedFeedbacks[d.id] || '',
        }))
      );

      setIsEditingGrades(false);
      setGradeSaveSuccess('✅ Đã lưu điểm và nhận xét của giáo viên thành công!');
    } catch (err) {
      setGradeSaveError(err.message || 'Lỗi khi lưu điểm.');
    } finally {
      setIsSavingGrades(false);
    }
  };

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

  const isFailed = submission.status === 'GRADING_FAILED' || submission.status === 'FAILED';

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
      {/* Banner thông báo lỗi nếu quá trình AI grading bị gián đoạn */}
      {isFailed && (
        <div
          style={{
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '1rem',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            color: '#b91c1c',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>
                ⚠️ Quá trình chấm tự động chưa hoàn tất
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#991b1b' }}>
                Hệ thống AI gặp sự cố tạm thời khi xử lý bài nộp. Bạn có thể yêu cầu chấm lại ngay bây giờ hoặc đợi giáo viên chấm thủ công.
              </p>
              {retryError && <p style={{ marginTop: '0.5rem', fontWeight: 600 }}>{retryError}</p>}
            </div>
            <button
              onClick={handleRetryGrading}
              disabled={isRetrying}
              style={{
                background: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '0.65rem 1.25rem',
                borderRadius: '0.5rem',
                fontWeight: 700,
                cursor: isRetrying ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              {isRetrying ? '⏳ Đang khởi động...' : '🔄 Thử chấm lại bằng AI'}
            </button>
          </div>
        </div>
      )}

      {/* Thanh điều khiển dành riêng cho Giáo viên (Instructor Edit Mode) */}
      {isInstructor && (
        <div
          style={{
            background: 'var(--card-bg)',
            border: '2px dashed #6366f1',
            borderRadius: '1.25rem',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <span style={{ fontWeight: 800, color: '#4f46e5', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              👨‍🏫 Bảng Điều Khiển Của Giảng Viên
            </span>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Bạn có thể điều chỉnh điểm số từng câu và ghi đè nhận xét sư phạm cho học viên.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {!isEditingGrades ? (
              <button
                onClick={handleStartEditGrades}
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  color: 'white',
                  border: 'none',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                }}
              >
                ✏️ Chỉnh sửa điểm & nhận xét
              </button>
            ) : (
              <>
                <button
                  onClick={handleCancelEditGrades}
                  disabled={isSavingGrades}
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    padding: '0.6rem 1.2rem',
                    borderRadius: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ❌ Hủy
                </button>
                <button
                  onClick={handleSaveGrades}
                  disabled={isSavingGrades}
                  style={{
                    background: '#16a34a',
                    color: 'white',
                    border: 'none',
                    padding: '0.6rem 1.25rem',
                    borderRadius: '0.75rem',
                    fontWeight: 700,
                    cursor: isSavingGrades ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                  }}
                >
                  {isSavingGrades ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Thông báo kết quả lưu điểm của giáo viên */}
      {gradeSaveSuccess && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#15803d', padding: '1rem 1.25rem', borderRadius: '0.75rem', marginBottom: '1.5rem', fontWeight: 600 }}>
          {gradeSaveSuccess}
        </div>
      )}
      {gradeSaveError && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626', padding: '1rem 1.25rem', borderRadius: '0.75rem', marginBottom: '1.5rem', fontWeight: 600 }}>
          ⚠️ {gradeSaveError}
        </div>
      )}

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
        isEditingGrades={isEditingGrades}
        editedScores={editedScores}
        editedFeedbacks={editedFeedbacks}
        onScoreChange={handleScoreChange}
        onFeedbackChange={handleFeedbackChange}
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
          to={currentUser?.role === 'ROLE_COURSE_PROVIDER' ? '/provider/feedbacks' : '/learner/lessons'}
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
          ← Trở lại {currentUser?.role === 'ROLE_COURSE_PROVIDER' ? 'danh sách phản hồi' : 'danh sách bài học'}
        </Link>
      </div>
    </div>
  );
};

export default SubmissionResult;

