package com.etsaion.utils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.security.Key;
import java.util.Date;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expire:86400000}")
    private long jwtExpire;

    private static Key key;
    private static long staticExpire;

    @PostConstruct
    public void init() {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException("JWT_SECRET 环境变量未配置，应用启动中止");
        }
        byte[] keyBytes = Decoders.BASE64.decode(jwtSecret);
        // 如果密钥不足 256 bits (32 bytes)，用 SHA-256 哈希补齐
        if (keyBytes.length < 32) {
            java.security.MessageDigest digest;
            try {
                digest = java.security.MessageDigest.getInstance("SHA-256");
            } catch (java.security.NoSuchAlgorithmException e) {
                throw new IllegalStateException("SHA-256 not available", e);
            }
            keyBytes = digest.digest(keyBytes);
        }
        key = Keys.hmacShaKeyFor(keyBytes);
        staticExpire = jwtExpire;
    }

    public static String generateToken(Long userId, String role) {
        return generateToken(userId, role, null);
    }

    public static String generateToken(Long userId, String role, String username) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + staticExpire);

        return Jwts.builder()
                .setSubject(String.valueOf(userId))
                .claim("role", role)
                .claim("username", username)
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public static boolean validateToken(String token) {
        try {
            Claims claims = Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
            return claims.getSubject() != null
                    && claims.get("role", String.class) != null
                    && claims.get("username", String.class) != null;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public static Long getUserIdFromToken(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
        return Long.parseLong(claims.getSubject());
    }

    public static String getRoleFromToken(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
        return claims.get("role", String.class);
    }

    public static String getUsernameFromToken(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
        return claims.get("username", String.class);
    }
}
