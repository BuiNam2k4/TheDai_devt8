import React, { useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";

const Home = () => {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser?.role === 'ROLE_ADMIN') {
      navigate('/admin/users');
    }
  }, [currentUser, navigate]);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem', width: '100%' }}>
      {/* ── Top Decorative Badge ── */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15))',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          padding: '0.45rem 1.25rem',
          borderRadius: '9999px',
          fontSize: '0.88rem',
          fontWeight: 600,
          color: '#c084fc',
          boxShadow: '0 4px 20px rgba(168, 85, 247, 0.15)'
        }}>
          ✨ Nền Tảng Học Tập & Chấm Điểm Tự Luận AI Thế Hệ Mới
        </span>
      </div>

      {/* ── Main Hero Header ── */}
      <header style={{
        textAlign: 'center',
        background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
        border: '1px solid var(--border-color)',
        borderRadius: '1.5rem',
        padding: '3.5rem 2rem',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(16px)',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: '2.5rem'
      }}>
        {/* Glow lights background */}
        <div style={{
          position: 'absolute',
          top: '-30%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '500px',
          height: '250px',
          background: 'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.25), transparent 70%)',
          pointerEvents: 'none'
        }} />

        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3.2rem)',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          lineHeight: 1.2,
          marginBottom: '1.25rem',
          background: 'linear-gradient(135deg, #ffffff 30%, #a5b4fc 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Học Tập Thông Minh Với <span style={{ color: 'var(--primary-color)', WebkitTextFillColor: 'var(--primary-color)' }}>HanoiPrep</span>
        </h1>

        <p style={{
          fontSize: '1.1rem',
          color: 'var(--text-muted)',
          maxWidth: '680px',
          margin: '0 auto 2.5rem auto',
          lineHeight: 1.6
        }}>
          Hệ thống thẩm định học liệu tự động, bóc tách barem chuẩn xác và hỗ trợ học sinh giải đáp thắc mắc sau khi chấm bài tức thì cùng Trợ lý AI.
        </p>

        {currentUser ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <span style={{
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              padding: '0.65rem 1.25rem',
              borderRadius: '0.75rem',
              color: 'var(--text-main)',
              fontWeight: 500,
              fontSize: '0.95rem'
            }}>
              👋 Xin chào, <strong>{currentUser.username}</strong>
            </span>
            {currentUser.role === 'ROLE_COURSE_PROVIDER' ? (
              <Link
                to="/provider/lessons/upload"
                className="btn btn-primary"
                style={{
                  padding: '0.75rem 1.75rem',
                  borderRadius: '0.75rem',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                ➕ Tạo bài học mới
              </Link>
            ) : (
              <Link
                to="/learner/lessons"
                className="btn btn-primary"
                style={{
                  padding: '0.75rem 1.75rem',
                  borderRadius: '0.75rem',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                📚 Khám phá bài học & Luyện thi
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link
              to="/login"
              className="btn btn-primary"
              style={{
                padding: '0.85rem 2rem',
                borderRadius: '0.75rem',
                fontWeight: 600,
                fontSize: '1rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)'
              }}
            >
              🔑 Đăng Nhập
            </Link>
            <Link
              to="/signup"
              className="btn btn-secondary"
              style={{
                padding: '0.85rem 2rem',
                borderRadius: '0.75rem',
                fontWeight: 600,
                fontSize: '1rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              🚀 Đăng Ký Tài Khoản
            </Link>
          </div>
        )}
      </header>

      {/* ── Feature Highlights Cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem',
      }}>
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '1rem',
          padding: '1.5rem',
          transition: 'transform 0.2s',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <div style={{ fontSize: '1.8rem' }}>🎯</div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            Thẩm Định Nhất Quán
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
            Tự động kiểm tra chéo Đề bài và Đáp án bằng AI, ngăn chặn tài liệu rác và lệch nội dung.
          </p>
        </div>

        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '1rem',
          padding: '1.5rem',
          transition: 'transform 0.2s',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <div style={{ fontSize: '1.8rem' }}>⚡</div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            Chấm Tự Luận Chuẩn Barem
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
            Bóc tách từng bước giải chi tiết và chấm điểm theo tiêu chí Rubric minh bạch từng câu.
          </p>
        </div>

        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '1rem',
          padding: '1.5rem',
          transition: 'transform 0.2s',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <div style={{ fontSize: '1.8rem' }}>🤖</div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            Trợ Lý Giải Đáp Tức Thì
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
            Học sinh có thể hỏi đáp thắc mắc về điểm số và hỗ trợ gửi phúc khảo cho giáo viên nhanh chóng.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;

