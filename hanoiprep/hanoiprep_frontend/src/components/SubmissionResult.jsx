import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import authHeader from '../services/auth-header';

const SubmissionResult = () => {
    const { id } = useParams();
    const [submission, setSubmission] = useState(null);
    const [details, setDetails] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

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

                // Nếu đã chấm xong thì tải chi tiết
                if (subData.status === 'GRADED') {
                    const detRes = await fetch(`http://localhost:8080/api/submissions/${id}/details`, {
                        headers: authHeader(),
                    });
                    if (detRes.ok) {
                        const detData = await detRes.json();
                        setDetails(detData);
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
