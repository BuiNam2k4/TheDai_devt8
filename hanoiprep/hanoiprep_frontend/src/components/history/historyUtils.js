export const getScoreColor = (score) => {
  if (score == null) return '#94a3b8';
  if (score >= 8.0) return '#10b981'; // Green
  if (score >= 5.0) return '#f59e0b'; // Amber
  return '#ef4444'; // Red
};

export const getEvaluationBadge = (bestScore) => {
  if (bestScore == null) {
    return { text: 'Chờ chấm điểm', bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' };
  }
  if (bestScore >= 8.5) {
    return { text: '🏆 Xuất sắc', bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' };
  }
  if (bestScore >= 7.0) {
    return { text: '⭐ Khá - Giỏi', bg: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' };
  }
  if (bestScore >= 5.0) {
    return { text: '👍 Đạt yêu cầu', bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' };
  }
  return { text: '⚠️ Cần cải thiện', bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171' };
};
