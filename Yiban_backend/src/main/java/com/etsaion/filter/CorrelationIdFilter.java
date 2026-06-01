package com.etsaion.filter;

import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.servlet.*;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;

/**
 * Filter that generates and propagates a correlation ID for request tracing.
 * The correlation ID is:
 * - Accepted from the X-Correlation-Id request header if present
 * - Generated as a UUID if not provided
 * - Stored in SLF4J MDC for structured logging (appears in every log line)
 * - Set as a request attribute for programmatic access
 * - Added to the X-Correlation-Id response header
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10) // Run early, but after Spring's own infrastructure filters
public class CorrelationIdFilter implements Filter {

    public static final String CORRELATION_ID_HEADER = "X-Correlation-Id";
    public static final String CORRELATION_ID_MDC_KEY = "correlationId";
    public static final String CORRELATION_ID_ATTR = "correlationId";

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        String correlationId = httpRequest.getHeader(CORRELATION_ID_HEADER);
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = UUID.randomUUID().toString().replace("-", "");
        }

        // Store in MDC for logging
        MDC.put(CORRELATION_ID_MDC_KEY, correlationId);

        // Store as request attribute for programmatic access
        httpRequest.setAttribute(CORRELATION_ID_ATTR, correlationId);

        // Add to response header so clients can correlate
        httpResponse.setHeader(CORRELATION_ID_HEADER, correlationId);

        try {
            chain.doFilter(request, response);
        } finally {
            // Always clean up MDC to prevent thread-local leaks
            MDC.remove(CORRELATION_ID_MDC_KEY);
        }
    }
}
