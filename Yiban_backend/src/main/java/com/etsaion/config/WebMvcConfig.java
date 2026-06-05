package com.etsaion.config;

import com.etsaion.interceptor.AuthInterceptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.File;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Autowired
    private AuthInterceptor authInterceptor;

    @Value("${file.upload-path}")
    private String uploadPath;

    @Override
    public void addInterceptors(org.springframework.web.servlet.config.annotation.InterceptorRegistry registry) {
        registry.addInterceptor(authInterceptor)
                .addPathPatterns("/**")
                .excludePathPatterns(
                        "/api/auth/login",
                        "/api/auth/register",
                        "/swagger-ui.html",
                        "/swagger-ui/**",
                        "/v3/api-docs/**",
                        "/api-docs/**",
                        "/swagger-resources/**",
                        "/webjars/**"
                );
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Map /files/** to physical path (always absolute, regardless of JVM cwd)
        File uploadDir = new File(uploadPath).getAbsoluteFile();
        if (!uploadDir.exists()) {
            uploadDir.mkdirs();
        }
        String absolutePath = uploadDir.getAbsolutePath();
        if (!absolutePath.endsWith(File.separator)) {
            absolutePath += File.separator;
        }

        registry.addResourceHandler("/files/**")
                .addResourceLocations("file:" + absolutePath);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns("http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("Authorization", "Content-Type", "X-Correlation-Id", "Accept")
                .exposedHeaders("X-Correlation-Id")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
