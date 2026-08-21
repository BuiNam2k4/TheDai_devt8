package com.hanoiprep.hses.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    SUCCESS(1000, "Thành công", HttpStatus.OK),
    UNCATEGORIZED_EXCEPTION(9999, "Lỗi hệ thống không xác định", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_KEY(1001, "Khóa cấu hình không hợp lệ", HttpStatus.BAD_REQUEST),
    USER_EXISTED(1002, "Tên người dùng đã tồn tại", HttpStatus.BAD_REQUEST),
    EMAIL_EXISTED(1003, "Email đã tồn tại", HttpStatus.BAD_REQUEST),
    USER_NOT_FOUND(1004, "Không tìm thấy người dùng", HttpStatus.NOT_FOUND),
    USER_DISABLED(1005, "Tài khoản người dùng đã bị vô hiệu hóa", HttpStatus.FORBIDDEN),
    UNAUTHENTICATED(1006, "Chưa xác thực hoặc token không hợp lệ", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED(1007, "Bạn không có quyền thực hiện hành động này", HttpStatus.FORBIDDEN),
    INVALID_PASSWORD(1008, "Mật khẩu hiện tại không chính xác", HttpStatus.BAD_REQUEST),
    PASSWORD_NOT_MATCH(1009, "Mật khẩu xác nhận không khớp", HttpStatus.BAD_REQUEST),
    LESSON_NOT_FOUND(2001, "Không tìm thấy bài học", HttpStatus.NOT_FOUND),
    RUBRIC_NOT_FOUND(2002, "Không tìm thấy tiêu chí Barem", HttpStatus.NOT_FOUND),
    SUBMISSION_NOT_FOUND(3001, "Không tìm thấy bài nộp", HttpStatus.NOT_FOUND),
    FEEDBACK_NOT_FOUND(4001, "Không tìm thấy phản hồi", HttpStatus.NOT_FOUND),
    FILE_UPLOAD_FAILED(5001, "Tải tệp tin lên thất bại", HttpStatus.INTERNAL_SERVER_ERROR),
    AI_GRADING_FAILED(6001, "Quá trình AI chấm điểm gặp lỗi", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_INPUT(8001, "Dữ liệu đầu vào không hợp lệ", HttpStatus.BAD_REQUEST);

    private final int code;
    private final String message;
    private final HttpStatus httpStatus;

    ErrorCode(int code, String message, HttpStatus httpStatus) {
        this.code = code;
        this.message = message;
        this.httpStatus = httpStatus;
    }
}
