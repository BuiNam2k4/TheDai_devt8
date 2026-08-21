package com.hanoiprep.hses.common.exception;

import com.hanoiprep.hses.common.dto.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse<Object>> handleAppException(AppException exception) {
        ErrorCode errorCode = exception.getErrorCode();
        log.warn("AppException occurred: code={}, message={}", errorCode.getCode(), exception.getMessage());

        ApiResponse<Object> apiResponse = ApiResponse.builder()
                .code(errorCode.getCode())
                .message(exception.getMessage())
                .result(null)
                .build();

        return ResponseEntity.status(errorCode.getHttpStatus()).body(apiResponse);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Object>> handleAccessDeniedException(AccessDeniedException exception) {
        log.warn("AccessDeniedException: {}", exception.getMessage());
        ErrorCode errorCode = ErrorCode.UNAUTHORIZED;

        ApiResponse<Object> apiResponse = ApiResponse.builder()
                .code(errorCode.getCode())
                .message(errorCode.getMessage())
                .result(null)
                .build();

        return ResponseEntity.status(errorCode.getHttpStatus()).body(apiResponse);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Object>> handleBadCredentialsException(BadCredentialsException exception) {
        log.warn("BadCredentialsException: {}", exception.getMessage());
        ErrorCode errorCode = ErrorCode.INVALID_PASSWORD;

        ApiResponse<Object> apiResponse = ApiResponse.builder()
                .code(errorCode.getCode())
                .message("Tên đăng nhập hoặc mật khẩu không chính xác")
                .result(null)
                .build();

        return ResponseEntity.status(errorCode.getHttpStatus()).body(apiResponse);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidationExceptions(MethodArgumentNotValidException exception) {
        Map<String, String> errors = new HashMap<>();
        exception.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });

        ApiResponse<Map<String, String>> apiResponse = ApiResponse.<Map<String, String>>builder()
                .code(ErrorCode.INVALID_INPUT.getCode())
                .message(ErrorCode.INVALID_INPUT.getMessage())
                .result(errors)
                .build();

        return ResponseEntity.badRequest().body(apiResponse);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleGeneralException(Exception exception) {
        log.error("Unhandled Exception: ", exception);

        ApiResponse<Object> apiResponse = ApiResponse.builder()
                .code(ErrorCode.UNCATEGORIZED_EXCEPTION.getCode())
                .message(exception.getMessage() != null ? exception.getMessage() : ErrorCode.UNCATEGORIZED_EXCEPTION.getMessage())
                .result(null)
                .build();

        return ResponseEntity.internalServerError().body(apiResponse);
    }
}
