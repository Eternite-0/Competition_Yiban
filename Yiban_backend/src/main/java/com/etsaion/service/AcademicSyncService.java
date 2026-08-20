package com.etsaion.service;

import com.etsaion.dto.AcademicSyncRequest;
import com.etsaion.vo.StudentAcademicSnapshotVO;

import java.util.Map;

public interface AcademicSyncService {
    StudentAcademicSnapshotVO getLatestForStudent(Long studentId);

    StudentAcademicSnapshotVO syncForStudent(Long studentId, AcademicSyncRequest request);

    Map<String, Object> beginChallenge(Long studentId, String baseUrl);

    Map<String, Object> login(Long studentId, AcademicSyncRequest request);

    void logout(Long studentId, String sessionId);
}
