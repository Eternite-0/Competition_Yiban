package com.etsaion.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.etsaion.academic.AcademicRemoteException;
import com.etsaion.academic.AcademicSessionStore;
import com.etsaion.academic.JwSession;
import com.etsaion.config.AcademicProperties;
import com.etsaion.dto.AcademicSyncRequest;
import com.etsaion.entity.StudentAcademicGrade;
import com.etsaion.entity.StudentAcademicSchedule;
import com.etsaion.entity.StudentAcademicSnapshot;
import com.etsaion.entity.StudentAcademicSync;
import com.etsaion.entity.User;
import com.etsaion.exception.BusinessException;
import com.etsaion.mapper.StudentAcademicGradeMapper;
import com.etsaion.mapper.StudentAcademicScheduleMapper;
import com.etsaion.mapper.StudentAcademicSnapshotMapper;
import com.etsaion.mapper.StudentAcademicSyncMapper;
import com.etsaion.service.AcademicSyncService;
import com.etsaion.vo.StudentAcademicSnapshotVO;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.net.URI;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class AcademicSyncServiceImpl implements AcademicSyncService {
    private static final Pattern YEAR = Pattern.compile("(19|20)\\d{2}");

    private final com.etsaion.service.UserService userService;
    private final AcademicProperties properties;
    private final AcademicSessionStore sessions;
    private final StudentAcademicSyncMapper syncMapper;
    private final StudentAcademicSnapshotMapper snapshotMapper;
    private final StudentAcademicGradeMapper gradeMapper;
    private final StudentAcademicScheduleMapper scheduleMapper;

    public AcademicSyncServiceImpl(
            com.etsaion.service.UserService userService,
            AcademicProperties properties,
            AcademicSessionStore sessions,
            StudentAcademicSyncMapper syncMapper,
            StudentAcademicSnapshotMapper snapshotMapper,
            StudentAcademicGradeMapper gradeMapper,
            StudentAcademicScheduleMapper scheduleMapper) {
        this.userService = userService;
        this.properties = properties;
        this.sessions = sessions;
        this.syncMapper = syncMapper;
        this.snapshotMapper = snapshotMapper;
        this.gradeMapper = gradeMapper;
        this.scheduleMapper = scheduleMapper;
    }

    @Override
    public StudentAcademicSnapshotVO getLatestForStudent(Long studentId) {
        StudentAcademicSnapshot snapshot = snapshotMapper.selectOne(new LambdaQueryWrapper<StudentAcademicSnapshot>()
                .eq(StudentAcademicSnapshot::getStudentId, studentId)
                .orderByDesc(StudentAcademicSnapshot::getSyncedAt)
                .last("LIMIT 1"));
        if (snapshot == null) return null;
        StudentAcademicSnapshotVO vo = new StudentAcademicSnapshotVO();
        BeanUtils.copyProperties(snapshot, vo);
        return vo;
    }

    @Override
    public Map<String, Object> beginChallenge(Long studentId, String baseUrl) {
        ensureEnabled();
        JwSession session = new JwSession(resolveBaseUrl(baseUrl));
        String sessionId = sessions.create(studentId, session);
        try {
            return mapOf("sessionId", sessionId, "captchaBase64", session.beginWebvpn(), "captchaEncoding", "base64");
        } catch (RuntimeException exception) {
            sessions.remove(sessionId, studentId);
            throw exception;
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> login(Long studentId, AcademicSyncRequest request) {
        ensureEnabled();
        User user = requireStudent(studentId);
        if (!hasText(request.getPassword())) throw new BusinessException(400, "请输入教务系统密码");
        String username = hasText(request.getTeachingUsername()) ? request.getTeachingUsername().trim() : user.getUsername();
        JwSession session;
        String sessionId = request.getSessionId();
        if (hasText(sessionId)) {
            session = sessions.get(sessionId, studentId);
            String webvpnUsername = hasText(request.getWebvpnUsername()) ? request.getWebvpnUsername().trim() : username;
            String webvpnPassword = hasText(request.getWebvpnPassword()) ? request.getWebvpnPassword() : request.getPassword();
            session.completeWebvpn(webvpnUsername, webvpnPassword, request.getVerificationCode());
        } else {
            session = new JwSession(resolveBaseUrl(request.getBaseUrl()));
            sessionId = sessions.create(studentId, session);
        }
        session.loginAcademic(username, request.getPassword());
        StudentAcademicSnapshotVO snapshot = syncWithSession(studentId, user, session, sessionId);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("sessionId", sessionId);
        result.put("academicAuthenticated", true);
        result.put("studentInfo", safeInfo(session));
        result.put("summary", snapshot);
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public StudentAcademicSnapshotVO syncForStudent(Long studentId, AcademicSyncRequest request) {
        ensureEnabled();
        User user = requireStudent(studentId);
        JwSession session = sessions.get(request.getSessionId(), studentId);
        if (!session.isAcademicAuthenticated()) {
            // This is the remote academic session state, not an expired 易赛通 JWT.
            throw new BusinessException(422, "请先登录教务系统");
        }
        return syncWithSession(studentId, user, session, request.getSessionId());
    }

    @Override
    public void logout(Long studentId, String sessionId) {
        if (sessionId != null) sessions.remove(sessionId, studentId);
        else sessions.removeAll(studentId);
    }

    private StudentAcademicSnapshotVO syncWithSession(Long studentId, User user, JwSession session, String sessionId) {
        LocalDateTime started = LocalDateTime.now();
        StudentAcademicSync sync = new StudentAcademicSync();
        sync.setStudentId(studentId);
        sync.setStudentNo(user.getUsername());
        sync.setSource("zf");
        sync.setStatus("running");
        sync.setStartedAt(started);
        sync.setCreateTime(started);
        sync.setUpdateTime(started);
        syncMapper.insert(sync);
        try {
            Map<String, Object> info = safeInfo(session);
            String remoteStudentNo = stringValue(info.get("sid"));
            if (hasText(remoteStudentNo) && hasText(user.getUsername()) && !user.getUsername().equals(remoteStudentNo)) {
                throw new BusinessException(400, "教务系统登录账号与当前易赛通账号不一致");
            }
            BigDecimal gpa = decimalValue(safeGpa(session).get("gpa"));
            List<StudentAcademicGrade> grades = new ArrayList<>();
            List<StudentAcademicSchedule> schedules = new ArrayList<>();
            Set<String> seenGrades = new HashSet<>();
            Set<String> seenSchedules = new HashSet<>();
            int startYear = resolveStartYear(user.getGrade());
            int endYear = Year.now().getValue();
            for (int year = startYear; year <= endYear; year++) {
                for (int term = 1; term <= 2; term++) {
                    collectGrades(session, studentId, sync.getId(), year, term, grades, seenGrades);
                    collectSchedules(session, studentId, sync.getId(), year, term, schedules, seenSchedules);
                }
            }

            BigDecimal earnedCredits = BigDecimal.ZERO;
            int passed = 0;
            int failed = 0;
            for (StudentAcademicGrade grade : grades) {
                if (Boolean.TRUE.equals(grade.getIsPassed())) {
                    passed++;
                    if (grade.getCredit() != null) earnedCredits = earnedCredits.add(grade.getCredit());
                } else if (Boolean.FALSE.equals(grade.getIsPassed())) {
                    failed++;
                }
            }

            StudentAcademicSnapshot snapshot = new StudentAcademicSnapshot();
            snapshot.setStudentId(studentId);
            snapshot.setStudentNo(user.getUsername());
            snapshot.setSyncId(sync.getId());
            snapshot.setSource("zf");
            snapshot.setGpa(gpa);
            snapshot.setEarnedCredits(earnedCredits);
            snapshot.setPlannedTotalCourses(grades.size());
            snapshot.setPlannedPassedCourses(passed);
            snapshot.setPlannedFailedCourses(failed);
            snapshot.setPlannedInProgressCourses(0);
            snapshot.setRiskLevel(failed > 0 ? "attention" : "normal");
            snapshot.setSyncedAt(LocalDateTime.now());
            snapshot.setCreateTime(LocalDateTime.now());
            snapshot.setUpdateTime(LocalDateTime.now());
            snapshotMapper.insert(snapshot);

            for (StudentAcademicGrade grade : grades) gradeMapper.insert(grade);
            for (StudentAcademicSchedule schedule : schedules) scheduleMapper.insert(schedule);

            sync.setStatus("success");
            sync.setFinishedAt(LocalDateTime.now());
            sync.setSnapshotId(snapshot.getId());
            sync.setGradeCount(grades.size());
            sync.setScheduleCount(schedules.size());
            sync.setPlanCourseCount(0);
            sync.setExamCount(0);
            sync.setNoticeCount(0);
            sync.setUpdateTime(LocalDateTime.now());
            syncMapper.updateById(sync);

            StudentAcademicSnapshotVO vo = new StudentAcademicSnapshotVO();
            BeanUtils.copyProperties(snapshot, vo);
            return vo;
        } catch (Exception exception) {
            sync.setStatus("failed");
            sync.setFinishedAt(LocalDateTime.now());
            sync.setErrorCode(exception instanceof AcademicRemoteException ? "ACADEMIC_REMOTE" : "SYNC_FAILED");
            sync.setErrorMessage(safeErrorMessage(exception));
            sync.setUpdateTime(LocalDateTime.now());
            syncMapper.updateById(sync);
            if (exception instanceof BusinessException businessException) throw businessException;
            if (exception instanceof AcademicRemoteException remoteException) {
                throw new BusinessException(remoteException.getStatus(), remoteException.getMessage());
            }
            throw new BusinessException(502, "教务数据同步失败，请稍后重试");
        }
    }

    private void collectGrades(JwSession session, Long studentId, Long syncId, int year, int term,
                               List<StudentAcademicGrade> target, Set<String> seen) {
        Map<String, Object> response;
        try { response = session.grades(year, term); }
        catch (AcademicRemoteException exception) {
            if (exception.getStatus() == 401) throw exception;
            return;
        }
        Object rawCourses = response.get("courses");
        if (!(rawCourses instanceof List<?> courses)) return;
        for (Object raw : courses) {
            if (!(raw instanceof Map<?, ?> row)) continue;
            String courseNo = stringValue(row.get("courseId"));
            String courseName = stringValue(row.get("title"));
            if (!hasText(courseName)) continue;
            String key = year + "|" + term + "|" + courseNo + "|" + courseName;
            if (!seen.add(key)) continue;
            StudentAcademicGrade grade = new StudentAcademicGrade();
            grade.setSyncId(syncId); grade.setStudentId(studentId); grade.setAcademicYear(String.valueOf(year)); grade.setTerm(String.valueOf(term));
            grade.setCourseNo(courseNo); grade.setCourseName(courseName); grade.setTeachingClass(stringValue(row.get("className")));
            grade.setTeacherName(stringValue(row.get("teacher"))); grade.setCredit(decimalValue(row.get("credit")));
            grade.setCourseCategory(stringValue(row.get("category"))); grade.setCourseNature(stringValue(row.get("nature")));
            String score = stringValue(row.get("grade"));
            grade.setScoreText(score); grade.setScoreNumeric(decimalValue(row.get("grade")));
            grade.setGradePoint(decimalValue(row.get("gradePoint"))); grade.setExamType(stringValue(row.get("gradeNature")));
            grade.setIsPassed(passState(score)); grade.setCreateTime(LocalDateTime.now());
            target.add(grade);
        }
    }

    private void collectSchedules(JwSession session, Long studentId, Long syncId, int year, int term,
                                  List<StudentAcademicSchedule> target, Set<String> seen) {
        Map<String, Object> response;
        try { response = session.schedule(year, term); }
        catch (AcademicRemoteException exception) {
            if (exception.getStatus() == 401) throw exception;
            return;
        }
        Object rawCourses = response.get("courses");
        if (!(rawCourses instanceof List<?> courses)) return;
        for (Object raw : courses) {
            if (!(raw instanceof Map<?, ?> row)) continue;
            String courseNo = stringValue(row.get("courseId"));
            String courseName = stringValue(row.get("title"));
            if (!hasText(courseName)) continue;
            String key = year + "|" + term + "|" + courseNo + "|" + courseName + "|" + stringValue(row.get("sessions"));
            if (!seen.add(key)) continue;
            StudentAcademicSchedule schedule = new StudentAcademicSchedule();
            schedule.setSyncId(syncId); schedule.setStudentId(studentId); schedule.setAcademicYear(String.valueOf(year)); schedule.setTerm(String.valueOf(term));
            schedule.setCourseNo(courseNo); schedule.setCourseName(courseName); schedule.setTeachingClass(stringValue(row.get("className")));
            schedule.setTeacherName(stringValue(row.get("teacher"))); schedule.setLocation(stringValue(row.get("place")));
            schedule.setWeekday(integerValue(row.get("weekday"))); schedule.setSectionText(stringValue(row.get("sessions")));
            schedule.setWeekText(stringValue(row.get("weeks"))); schedule.setCreateTime(LocalDateTime.now());
            target.add(schedule);
        }
    }

    private Map<String, Object> safeInfo(JwSession session) { return session.info(); }
    private Map<String, Object> safeGpa(JwSession session) { return session.gpa(); }

    private User requireStudent(Long studentId) {
        User user = userService.getById(studentId);
        if (user == null || !"student".equalsIgnoreCase(user.getRole())) throw new BusinessException(403, "仅学生账号可以同步教务数据");
        return user;
    }

    private void ensureEnabled() {
        if (!properties.isSyncEnabled()) {
            throw new BusinessException(503, "教务同步服务暂未开启");
        }
    }

    private String resolveBaseUrl(String requested) {
        String configured = properties.getBaseUrl();
        String value = hasText(requested) ? requested.trim() : configured;
        try {
            URI requestedUri = URI.create(value);
            URI configuredUri = URI.create(configured);
            if (!"https".equalsIgnoreCase(requestedUri.getScheme())
                    || requestedUri.getHost() == null
                    || configuredUri.getHost() == null
                    || !requestedUri.getHost().equalsIgnoreCase(configuredUri.getHost())) {
                throw new BusinessException(400, "教务系统地址必须使用已配置的学校地址");
            }
            return value;
        } catch (IllegalArgumentException exception) {
            throw new BusinessException(400, "教务系统地址格式不正确");
        }
    }

    private int resolveStartYear(String grade) {
        if (hasText(grade)) {
            Matcher matcher = YEAR.matcher(grade);
            if (matcher.find()) return Math.min(Integer.parseInt(matcher.group()), Year.now().getValue());
        }
        return Year.now().getValue() - 4;
    }

    private Boolean passState(String score) {
        if (!hasText(score)) return null;
        try { return new BigDecimal(score).compareTo(BigDecimal.valueOf(60)) >= 0; }
        catch (Exception ignored) {
            String normalized = score.toLowerCase();
            if (normalized.contains("不及格") || normalized.contains("不通过") || normalized.contains("挂科") || normalized.contains("fail")) return false;
            if (normalized.contains("合格") || normalized.contains("通过") || normalized.contains("优秀") || normalized.contains("良好") || normalized.contains("pass")) return true;
            return null;
        }
    }

    private String safeErrorMessage(Exception exception) {
        String message = exception.getMessage();
        return message == null ? "同步失败" : message.substring(0, Math.min(message.length(), 480));
    }

    private static boolean hasText(String value) { return value != null && !value.trim().isEmpty(); }
    private static String stringValue(Object value) { return value == null ? null : String.valueOf(value); }
    private static BigDecimal decimalValue(Object value) {
        if (value == null) return null;
        try { return new BigDecimal(String.valueOf(value)); } catch (Exception ignored) { return null; }
    }
    private static Integer integerValue(Object value) {
        try { return value == null ? null : Integer.valueOf(String.valueOf(value)); } catch (Exception ignored) { return null; }
    }
    private static Map<String, Object> mapOf(Object... values) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (int i = 0; i + 1 < values.length; i += 2) if (values[i + 1] != null) result.put((String) values[i], values[i + 1]);
        return result;
    }
}
