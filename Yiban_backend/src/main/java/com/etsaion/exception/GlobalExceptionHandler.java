package com.etsaion.exception;

import com.etsaion.dto.Result;
import com.etsaion.filter.CorrelationIdFilter;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public Result<?> handleBusinessException(BusinessException e) {
        log.warn("Business Exception: {}", e.getMessage());
        return Result.error(e.getCode(), e.getMessage());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public Result<?> handleHttpMessageNotReadableException(HttpMessageNotReadableException e) {
        log.warn("Request Body Parse Exception: {}", e.getMostSpecificCause().getMessage());
        return Result.error(400, "请求格式错误");
    }

    /**
     * 缺参数或参数类型不对是调用方的问题，不是服务端故障。
     * 没有这个处理器时它们会落到兜底分支，被报成 500。
     */
    @ExceptionHandler({MissingServletRequestParameterException.class,
            MethodArgumentTypeMismatchException.class})
    public Result<?> handleBadRequestParameter(Exception e) {
        String name = e instanceof MissingServletRequestParameterException
                ? ((MissingServletRequestParameterException) e).getParameterName()
                : ((MethodArgumentTypeMismatchException) e).getName();
        log.warn("Bad request parameter: {}", name);
        return Result.error(400, "请求参数不正确：" + name);
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, BindException.class})
    public Result<?> handleValidationException(Exception e) {
        String message;
        if (e instanceof MethodArgumentNotValidException) {
            message = ((MethodArgumentNotValidException) e).getBindingResult().getFieldErrors().stream()
                    .findFirst()
                    .map(error -> error.getDefaultMessage())
                    .orElse("请求参数校验失败");
        } else {
            message = ((BindException) e).getBindingResult().getFieldErrors().stream()
                    .findFirst()
                    .map(error -> error.getDefaultMessage())
                    .orElse("请求参数校验失败");
        }
        log.warn("Validation Exception: {}", message);
        return Result.error(400, message);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public Result<?> handleDataIntegrityViolationException(DataIntegrityViolationException e) {
        // 不记录完整异常消息，避免泄露数据库表名/列名
        log.warn("数据约束违反: 请求数据不符合业务约束");
        return Result.error(400, "数据不符合约束，请检查输入");
    }

    @ExceptionHandler(Exception.class)
    public Result<?> handleException(Exception e) {
        String correlationId = MDC.get(CorrelationIdFilter.CORRELATION_ID_MDC_KEY);
        log.error("System Exception [correlationId={}]: ", correlationId, e);
        return Result.error(500, "系统内部错误，请联系管理员");
    }
}
