package com.etsaion.academic;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/** Keeps remote cookies only in memory and scopes every session to one local student. */
@Service
public class AcademicSessionStore {
    private final ConcurrentHashMap<String, Entry> sessions = new ConcurrentHashMap<>();
    private final Duration ttl;

    public AcademicSessionStore(@Value("${academic.session-ttl-minutes:20}") long minutes) {
        this.ttl = Duration.ofMinutes(Math.max(5, minutes));
    }

    public String create(Long studentId, JwSession session) {
        cleanup();
        String id = UUID.randomUUID().toString();
        sessions.put(id, new Entry(studentId, session, Instant.now().plus(ttl)));
        return id;
    }

    public JwSession get(String id, Long studentId) {
        if (id == null || id.isBlank()) {
            throw new AcademicRemoteException(HttpStatus.BAD_REQUEST.value(), "请先连接教务系统");
        }
        Entry entry = sessions.get(id);
        if (entry == null || !studentId.equals(entry.studentId()) || entry.expiresAt().isBefore(Instant.now())) {
            sessions.remove(id);
            throw new AcademicRemoteException(HttpStatus.UNAUTHORIZED.value(), "教务系统会话不存在或已过期，请重新登录");
        }
        return entry.session();
    }

    public void remove(String id, Long studentId) {
        Entry entry = sessions.get(id);
        if (entry != null && studentId.equals(entry.studentId())) sessions.remove(id);
    }

    public void removeAll(Long studentId) {
        sessions.entrySet().removeIf(item -> studentId.equals(item.getValue().studentId()));
    }

    private void cleanup() {
        Instant now = Instant.now();
        sessions.entrySet().removeIf(item -> item.getValue().expiresAt().isBefore(now));
    }

    private record Entry(Long studentId, JwSession session, Instant expiresAt) { }
}
