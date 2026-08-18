import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import authHeader from '../services/auth-header';
import { AuthContext } from '../context/AuthContext';

const SubmissionResult = () => {
    const { id } = useParams();
    const { currentUser } = useContext(AuthContext);
    const [submission, setSubmission] = useState(null);
    const [details, setDetails] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    // Feedback state (no rating, comment only - optional)
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
                const subData = await subRes.json();
                setSubmission(subData);

                // Nếu đã chấm xong thì tải chi tiết và kiểm tra feedback đã có chưa
                if (subData.status === 'GRADED') {
                    const detRes = await fetch(`http://localhost:8080/api/submissions/${id}/details`, {
                        headers: authHeader(),
                    });
                    if (detRes.ok) {
                        const detData = await detRes.json();
                        setDetails(detData);
                    }

                    // Tải feedback đã gửi trước đó (nếu có)
                    try {
                        const fbRes = await fetch(`http://localhost:8080/api/feedbacks/submission/${id}`, {
                            headers: authHeader(),
                        });
                        if (fbRes.ok && fbRes.status === 200) {
                            const fbData = await fbRes.json();
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

                // Nếu status là PENDING_GRADING -> tiếp tục poll sau 2.5 giây
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
        if (!feedbackComment || !feedbackComment.trim()) {
            setFeedbackErrorMsg('Vui lòng nhập nội dung phản hồi trước khi gửi.');
            return;
        }

        const userId = currentUser?.id || submission?.user?.id;
        const lessonId = submission?.lesson?.id;

        if (!userId || !lessonId) {
            setFeedbackErrorMsg('Thiếu thông tin người dùng hoặc bài học để gửi phản hồi.');
            return;
        }

        setIsSubmittingFeedback(true);
        setFeedbackErrorMsg('');
        setFeedbackSuccessMsg('');

        try {
            const res = await fetch('http://localhost:8080/api/feedbacks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeader(),
                },
                body: JSON.stringify({
                    lessonId: lessonId,
                    userId: userId,
                    submissionId: parseInt(id, 10),
                    comment: feedbackComment.trim(),
                }),
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(errText || 'Không thể gửi phản hồi.');
            }

            const savedFb = await res.json();
            setExistingFeedback(savedFb);
            setFeedbackSuccessMsg('🎉 Phản hồi của bạn đã được ghi nhận và gửi đến giáo viên!');
        } catch (err) {
            setFeedbackErrorMsg(err.message || 'Lỗi khi gửi phản hồi.');
        } finally {
            setIsSubmittingFeedback(false);
        }
    };


    // Tính tổng điểm tối đa từ rubrics (nếu có)
    const totalMaxScore = details.reduce((sum, d) => sum + (d.rubric?.maxScore || 0), 0);
    const isFallbackMode = details.length > 0 && details[0].rubric === null;

    // Tính phần trăm điểm
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

    // Đang trong quá trình chấm điểm
    if (submission.status === 'PENDING_GRADING' || submission.status === 'PROCESSING') {
        return (
            <div style={{ maxWidth: '650px', margin: '4rem auto', padding: '3rem 2rem', background: 'var(--card-bg)', borderRadius: '1.5rem', border: '1px solid var(--border-color)', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
                <div style={{ width: '64px', height: '64px', margin: '0 auto 1.5rem', border: '5px solid var(--border-color)', borderTop: '5px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                    🤖 Hệ thống đang chấm bài...
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                    Bài làm của bạn đang được phân tích và đánh giá chi tiết theo từng câu hỏi. Trang sẽ tự động hiển thị kết quả ngay khi hoàn tất!
                </p>
                <span style={{ fontSize: '0.8rem', background: '#e0e7ff', color: '#3730a3', padding: '6px 16px', borderRadius: '99px', fontWeight: 600 }}>
                    ⚡ Đang xử lý tự động
                </span>
            </div>
        );
    }

    const displayScore = submission.totalScore ? submission.totalScore.toFixed(2) : '0';
    const displayMax = isFallbackMode ? '10' : (totalMaxScore > 0 ? totalMaxScore.toFixed(0) : '10');
    const scoreColor = getScoreColor(scorePercent);

    // Gom nhóm các tiêu chí theo tên Bài / Câu (questionNo)
    const groupedDetails = details.reduce((acc, detail) => {
        const qNo = detail.rubric?.questionNo || 'Chi tiết bài làm';
        if (!acc[qNo]) acc[qNo] = [];
        acc[qNo].push(detail);
        return acc;
    }, {});

    return (
        <div style={{ maxWidth: '880px', margin: '2rem auto', padding: '1.5rem' }}>
            {/* ── Header: Điểm tổng ── */}
            <div style={{
                background: 'var(--card-bg)',
                borderRadius: '1.5rem',
                padding: '2.5rem',
                textAlign: 'center',
                marginBottom: '1.5rem',
                border: '1px solid var(--border-color)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.08)'
            }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                    Kết quả chấm điểm AI • Bài #{submission.id}
                </p>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
                    {submission.lesson?.title || 'Bài làm'}
                </h1>

                {/* Score circle */}
                <div style={{
                    display: 'inline-flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: 'var(--bg-color)',
                    borderRadius: '50%',
                    width: '160px',
                    height: '160px',
                    justifyContent: 'center',
                    border: `6px solid ${scoreColor}`,
                    boxShadow: `0 0 0 4px ${scoreColor}22`,
                    marginBottom: '1.5rem'
                }}>
                    <span style={{ fontSize: '3rem', fontWeight: 900, color: scoreColor, lineHeight: 1 }}>
                        {displayScore}
                    </span>
                    <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {displayMax}</span>
                </div>

                {/* Progress bar */}
                <div style={{ maxWidth: '360px', margin: '0 auto' }}>
                    <div style={{ background: 'var(--border-color)', borderRadius: '99px', height: '10px', overflow: 'hidden' }}>
                        <div style={{
                            width: `${Math.min(scorePercent, 100)}%`,
                            height: '100%',
                            background: scoreColor,
                            borderRadius: '99px',
                            transition: 'width 1s ease'
                        }} />
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        {scorePercent.toFixed(1)}% điểm đạt được
                    </p>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                    Nộp lúc {new Date(submission.createdAt).toLocaleString('vi-VN')}
                </p>
            </div>

            {/* ── Nhận xét chi tiết phân theo từng Bài / Câu ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🤖 Kết quả đánh giá chi tiết theo từng Bài / Câu
                </h2>

                {Object.keys(groupedDetails).length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa có nhận xét nào.</p>
                ) : (
                    Object.entries(groupedDetails).map(([qNo, qDetails], qIndex) => {
                        const qMaxScore = qDetails.reduce((sum, d) => sum + (d.rubric?.maxScore || 0), 0);
                        const qAwarded = qDetails.reduce((sum, d) => sum + (d.awardedScore || 0), 0);
                        const qPercent = qMaxScore > 0 ? (qAwarded / qMaxScore) * 100 : 100;
                        const qColor = getScoreColor(qPercent);

                        return (
                            <div
                                key={qNo || qIndex}
                                style={{
                                    background: 'var(--card-bg)',
                                    borderRadius: '1.25rem',
                                    padding: '1.75rem',
                                    border: '1px solid var(--border-color)',
                                    boxShadow: '0 4px 18px rgba(0,0,0,0.05)'
                                }}
                            >
                                {/* Header Bài/Câu */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#4f46e5', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        📌 {qNo}
                                    </h3>
                                    <span style={{ background: `${qColor}15`, color: qColor, fontWeight: 700, padding: '4px 12px', borderRadius: '99px', fontSize: '0.9rem', border: `1px solid ${qColor}44` }}>
                                        Đạt {qAwarded.toFixed(1)} / {qMaxScore > 0 ? qMaxScore.toFixed(1) : '?'} điểm
                                    </span>
                                </div>

                                {/* Danh sách các bước trong Bài/Câu */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {qDetails.map((detail, stepIdx) => {
                                        const detailPercent = detail.rubric
                                            ? (detail.awardedScore / detail.rubric.maxScore) * 100
                                            : scorePercent;
                                        const detailColor = getScoreColor(detailPercent);
                                        const feedbackText = detail.aiFeedback || '';

                                        return (
                                            <div
                                                key={detail.id || stepIdx}
                                                style={{
                                                    background: 'var(--input-bg)',
                                                    borderRadius: '0.85rem',
                                                    padding: '1.25rem',
                                                    border: '1px solid var(--border-color)',
                                                    borderLeft: `4px solid ${detailColor}`
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                    <div>
                                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                                                            Bước {detail.rubric?.stepOrder || (stepIdx + 1)}: {detail.rubric?.stepDescription || 'Tiêu chí'}
                                                        </h4>
                                                        {detail.rubric?.expectedLogicKeyword && (
                                                            <span style={{ fontSize: '0.75rem', background: 'var(--border-color)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '99px' }}>
                                                                🔑 Từ khóa: {detail.rubric.expectedLogicKeyword}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div style={{
                                                        background: 'var(--bg-color)',
                                                        border: `1px solid ${detailColor}`,
                                                        borderRadius: '0.5rem',
                                                        padding: '0.25rem 0.6rem',
                                                        textAlign: 'center'
                                                    }}>
                                                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: detailColor }}>
                                                            {detail.awardedScore?.toFixed(1)}
                                                        </span>
                                                        {detail.rubric && (
                                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                                /{detail.rubric.maxScore}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div style={{
                                                    background: 'var(--bg-color)',
                                                    borderRadius: '0.5rem',
                                                    padding: '0.85rem',
                                                    fontSize: '0.88rem',
                                                    color: 'var(--text-primary)',
                                                    lineHeight: 1.6,
                                                    whiteSpace: 'pre-wrap'
                                                }}>
                                                    {feedbackText}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* ── Khối Phản hồi / Báo lỗi ── */}
            {currentUser?.role === 'ROLE_COURSE_PROVIDER' ? (
                /* Course Provider chỉ xem phản hồi của học viên nếu có */
                existingFeedback && (
                    <div style={{
                        marginTop: '2rem',
                        background: 'var(--card-bg)',
                        borderRadius: '1.25rem',
                        padding: '1.5rem 2rem',
                        border: '1px solid var(--border-color)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                        borderLeft: '5px solid #6366f1'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                💬 Phản hồi / Báo lỗi từ học viên ({existingFeedback.user?.username || submission?.user?.username || 'Học viên'})
                            </h3>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {existingFeedback.createdAt ? new Date(existingFeedback.createdAt).toLocaleString('vi-VN') : ''}
                            </span>
                        </div>
                        <div style={{
                            background: 'var(--input-bg)',
                            padding: '1rem 1.25rem',
                            borderRadius: '0.75rem',
                            color: 'var(--text-primary)',
                            fontSize: '0.95rem',
                            lineHeight: 1.6,
                            whiteSpace: 'pre-wrap',
                            border: '1px solid var(--border-color)'
                        }}>
                            {existingFeedback.comment}
                        </div>
                    </div>
                )
            ) : (
                /* Học viên có quyền nhập / báo lỗi (không bắt buộc) */
                <div style={{
                    marginTop: '2rem',
                    background: 'var(--card-bg)',
                    borderRadius: '1.25rem',
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                    overflow: 'hidden'
                }}>
                    {/* Thanh Header đóng/mở */}
                    <div
                        onClick={() => setIsFeedbackOpen(!isFeedbackOpen)}
                        style={{
                            padding: '1.25rem 1.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            background: isFeedbackOpen ? 'var(--input-bg)' : 'transparent',
                            borderBottom: isFeedbackOpen ? '1px solid var(--border-color)' : 'none',
                            transition: 'background 0.2s',
                            userSelect: 'none'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                            <div>
                                <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                                    Báo lỗi đề bài hoặc gửi góp ý cho giáo viên
                                </span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.5rem', fontWeight: 500 }}>
                                    (Không bắt buộc - chỉ gửi khi phát hiện sai sót)
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {existingFeedback && (
                                <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#15803d', padding: '3px 10px', borderRadius: '99px', fontWeight: 600, border: '1px solid #86efac' }}>
                                    ✓ Đã gửi phản hồi
                                </span>
                            )}
                            <span style={{
                                fontSize: '0.85rem',
                                color: 'var(--primary-color)',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem'
                            }}>
                                {isFeedbackOpen ? '▲ Thu gọn' : '▼ Nhập phản hồi'}
                            </span>
                        </div>
                    </div>

                    {/* Nội dung form khi mở */}
                    {isFeedbackOpen && (
                        <div style={{ padding: '1.75rem' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                                Nếu bạn nhận thấy đề bài bị lỗi, đáp án/rubric chưa chính xác hoặc có vấn đề cần thông báo cho giáo viên, hãy nhập mô tả bên dưới:
                            </p>

                            {feedbackSuccessMsg && (
                                <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#15803d', padding: '0.75rem 1.25rem', borderRadius: '0.75rem', marginBottom: '1.25rem', fontSize: '0.9rem', fontWeight: 500 }}>
                                    {feedbackSuccessMsg}
                                </div>
                            )}

                            {feedbackErrorMsg && (
                                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626', padding: '0.75rem 1.25rem', borderRadius: '0.75rem', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                                    ⚠️ {feedbackErrorMsg}
                                </div>
                            )}

                            <form onSubmit={handleSendFeedback}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <textarea
                                        className="form-control"
                                        rows="3"
                                        placeholder="Mô tả lỗi hoặc góp ý về bài học này (ví dụ: Câu 2 đề bài thiếu dữ kiện, công thức bị lỗi hiển thị...)"
                                        value={feedbackComment}
                                        onChange={(e) => setFeedbackComment(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.85rem 1rem',
                                            borderRadius: '0.75rem',
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--input-bg)',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.9rem',
                                            resize: 'vertical'
                                        }}
                                        required
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setIsFeedbackOpen(false)}
                                        style={{
                                            background: 'var(--input-bg)',
                                            border: '1px solid var(--border-color)',
                                            color: 'var(--text-muted)',
                                            padding: '0.6rem 1.25rem',
                                            borderRadius: '0.6rem',
                                            fontWeight: 600,
                                            fontSize: '0.88rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Đóng lại
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingFeedback || !feedbackComment.trim()}
                                        style={{
                                            background: 'var(--primary-color)',
                                            color: 'white',
                                            border: 'none',
                                            padding: '0.6rem 1.5rem',
                                            borderRadius: '0.6rem',
                                            fontWeight: 700,
                                            fontSize: '0.88rem',
                                            cursor: isSubmittingFeedback || !feedbackComment.trim() ? 'not-allowed' : 'pointer',
                                            opacity: isSubmittingFeedback || !feedbackComment.trim() ? 0.6 : 1,
                                            transition: 'all 0.2s',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        {isSubmittingFeedback ? (
                                            '⏳ Đang gửi...'
                                        ) : existingFeedback ? (
                                            '💾 Cập nhật phản hồi'
                                        ) : (
                                            '📤 Gửi phản hồi báo lỗi'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            )}

            {/* ── Footer ── */}
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
                        transition: 'background 0.2s'
                    }}
                >
                    ← Trở lại danh sách bài học
                </Link>
            </div>
        </div>
    );
};

export default SubmissionResult;
