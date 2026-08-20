package com.etsaion.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.map.MapUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.etsaion.entity.Submission;
import com.etsaion.entity.Registration;
import com.etsaion.entity.User;
import com.etsaion.entity.Competition;
import com.etsaion.entity.GrowthRecord;
import com.etsaion.entity.ComprehensiveScore;
import com.etsaion.entity.Activity;
import com.etsaion.entity.Participation;
import com.etsaion.entity.StudentAcademicSnapshot;
import com.etsaion.enums.RegistrationStatus;
import com.etsaion.enums.SubmissionStatus;
import com.etsaion.exception.BusinessException;
import com.etsaion.mapper.StudentAcademicSnapshotMapper;
import com.etsaion.service.*;
import com.etsaion.utils.UserContext;
import com.etsaion.vo.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Slf4j
@Service
public class TeacherServiceImpl implements TeacherService {

    @Autowired
    private UserService userService;

    @Autowired
    private RegistrationService registrationService;

    @Autowired
    private SubmissionService submissionService;

    @Autowired
    private CompetitionService competitionService;

    @Autowired
    private GrowthRecordService growthRecordService;

    @Autowired
    private ComprehensiveScoreService comprehensiveScoreService;

    @Autowired
    private ParticipationService participationService;

    @Autowired
    private ActivityService activityService;

    @Autowired
    private StudentAccessPolicy studentAccessPolicy;

    @Autowired
    private MajorService majorService;

    @Autowired
    private StudentAcademicSnapshotMapper studentAcademicSnapshotMapper;

    // ---- helpers ----

    private boolean isTeacherScopedRole() {
        return studentAccessPolicy.isCollegeScoped();
    }

    private String currentTeacherCollege() {
        return isTeacherScopedRole() ? scopedCollege(null) : null;
    }

    /**
     * 把请求的学院收敛到当前用户的可见范围。
     *
     * 越权与"教师没有学院因而无法判定范围"两种情况，
     * 在这里都表现为 {@link #DENIED_COLLEGE}——调用方据此返回空结果，
     * 而不是把异常抛给按学院筛选的列表接口。
     */
    private String scopedCollege(String requestedCollege) {
        try {
            return studentAccessPolicy.resolveRequestedCollege(requestedCollege);
        } catch (BusinessException e) {
            return DENIED_COLLEGE;
        }
    }

    private static final String DENIED_COLLEGE = "__NO_ACCESS__";

    private boolean deniedCollege(String college) {
        return DENIED_COLLEGE.equals(college);
    }

    private boolean canAccessStudent(User student) {
        return studentAccessPolicy.canAccess(student);
    }

    private String normalizeGrade(String grade) {
        if (StrUtil.isBlank(grade)) {
            return grade;
        }
        return grade.trim().replace("级", "");
    }

    private String displayMajor(String major) {
        return "软件工程(创新班)".equals(major) ? "软件工程" : major;
    }

    private List<String> majorAliases(String major) {
        if (StrUtil.isBlank(major)) {
            return List.of();
        }
        if ("软件工程".equals(major) || "软件工程(创新班)".equals(major)) {
            return List.of("软件工程", "软件工程(创新班)");
        }
        return List.of(major);
    }

    private LambdaQueryWrapper<User> applyMajorFilter(LambdaQueryWrapper<User> wrapper, String major) {
        if (StrUtil.isBlank(major)) {
            return wrapper;
        }
        List<String> aliases = majorAliases(major);
        if (aliases.size() > 1) {
            return wrapper.in(User::getMajor, aliases);
        }
        return wrapper.eq(User::getMajor, major);
    }

    private LambdaQueryWrapper<User> studentQuery(String college, String grade, String major, String className) {
        String effectiveCollege = scopedCollege(college);
        String normalizedGrade = normalizeGrade(grade);
        LambdaQueryWrapper<User> w = new LambdaQueryWrapper<User>().eq(User::getRole, "student");
        if (StrUtil.isNotBlank(effectiveCollege)) w.eq(User::getCollege, effectiveCollege);
        if (StrUtil.isNotBlank(normalizedGrade)) w.eq(User::getGrade, normalizedGrade);
        applyMajorFilter(w, major);
        if (StrUtil.isNotBlank(className))  w.eq(User::getClassName, className);
        return w;
    }

    private List<Long> studentIds(List<User> students) {
        return students.stream().map(User::getId).collect(Collectors.toList());
    }

    // ---- existing (updated signatures) ----

    @Override
    public Map<String, Object> getDashboardStats(String college, String grade, String major, String className) {
        Map<String, Object> stats = new HashMap<>();

        List<User> students = userService.list(studentQuery(college, grade, major, className));
        int totalStudents = students.size();
        stats.put("totalStudents", totalStudents);

        if (totalStudents == 0) {
            stats.put("totalRegistrations", 0);
            stats.put("activeCoefficient", 0.0);
            stats.put("pendingReviews", 0);
            stats.put("recentActivities", new ArrayList<>());
            return stats;
        }

        List<Long> sIds = studentIds(students);
        List<Registration> regs = registrationService.list(new LambdaQueryWrapper<Registration>()
                .in(Registration::getStudentId, sIds));

        int totalRegistrations = regs.size();
        stats.put("totalRegistrations", totalRegistrations);

        double activeCoeff = Math.round(((double) totalRegistrations / totalStudents) * 100.0) / 100.0;
        stats.put("activeCoefficient", activeCoeff);

        long pendingReviews = regs.stream()
                .filter(r -> RegistrationStatus.isReviewable(r.getStatus()))
                .count();
        stats.put("pendingReviews", pendingReviews);

        List<Map<String, Object>> activities = new ArrayList<>();
        List<Registration> recentRegs = regs.stream()
                .sorted(Comparator.comparing(Registration::getSubmitDate, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(5)
                .collect(Collectors.toList());

        for (Registration r : recentRegs) {
            User student = students.stream().filter(u -> u.getId().equals(r.getStudentId())).findFirst().orElse(null);
            if (student != null) {
                activities.add(MapUtil.<String, Object>builder()
                        .put("studentName", student.getRealName())
                        .put("class", student.getClassName())
                        .put("submitDate", r.getSubmitDate())
                        .put("status", r.getStatus())
                        .build());
            }
        }
        stats.put("recentActivities", activities);

        return stats;
    }

    @Override
    public Page<RegistrationVO> monitorStudentEvents(int current, int size, String studentName, String status, String className, String college, String grade, String major) {
        Page<Registration> page = new Page<>(current, size);
        LambdaQueryWrapper<Registration> wrapper = new LambdaQueryWrapper<>();
        String effectiveCollege = scopedCollege(college);
        String normalizedGrade = normalizeGrade(grade);

        boolean needStudentFilter = StrUtil.isNotBlank(studentName) || StrUtil.isNotBlank(className)
                || StrUtil.isNotBlank(effectiveCollege) || StrUtil.isNotBlank(normalizedGrade) || StrUtil.isNotBlank(major);

        List<Long> studentIds = null;
        if (needStudentFilter) {
            LambdaQueryWrapper<User> userWrapper = new LambdaQueryWrapper<User>()
                    .eq(User::getRole, "student")
                    .like(StrUtil.isNotBlank(studentName), User::getRealName, studentName)
                    .eq(StrUtil.isNotBlank(className), User::getClassName, className)
                    .eq(StrUtil.isNotBlank(effectiveCollege), User::getCollege, effectiveCollege)
                    .eq(StrUtil.isNotBlank(normalizedGrade), User::getGrade, normalizedGrade);
            applyMajorFilter(userWrapper, major);

            List<User> students = userService.list(userWrapper);
            if (CollUtil.isEmpty(students)) {
                return registrationService.toVOPage(page);
            }
            studentIds = students.stream().map(User::getId).collect(Collectors.toList());
        }

        wrapper.in(CollUtil.isNotEmpty(studentIds), Registration::getStudentId, studentIds)
               .eq(StrUtil.isNotBlank(status), Registration::getStatus, status)
               .orderByDesc(Registration::getSubmitDate);

        Page<Registration> raw = registrationService.page(page, wrapper);
        return registrationService.toVOPage(raw);
    }

    @Override
    public Page<UserVO> listStudentsPage(int current, int size, String keyword, String college, String className, String grade, String major) {
        return listStudentsPage(current, size, keyword, college, className, grade, major, null);
    }

    @Override
    public Page<UserVO> listStudentsPage(int current, int size, String keyword, String college, String className, String grade, String major, String sort) {
        String effectiveCollege = scopedCollege(college);
        String normalizedGrade = normalizeGrade(grade);
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<User>()
                .eq(User::getRole, "student")
                .eq(StrUtil.isNotBlank(effectiveCollege), User::getCollege, effectiveCollege)
                .eq(StrUtil.isNotBlank(className), User::getClassName, className)
                .eq(StrUtil.isNotBlank(normalizedGrade), User::getGrade, normalizedGrade);
        applyMajorFilter(wrapper, major);

        if (StrUtil.isNotBlank(keyword)) {
            wrapper.and(w -> w.like(User::getRealName, keyword)
                              .or().like(User::getUsername, keyword)
                              .or().like(User::getMajor, keyword));
        }

        if ("comprehensive_desc".equalsIgnoreCase(sort)) {
            wrapper.orderByAsc(User::getMajor).orderByAsc(User::getClassName).orderByAsc(User::getId);
            List<User> users = userService.list(wrapper);
            Map<String, ComprehensiveScore> scores = latestComprehensiveScores(users);
            List<UserVO> records = users.stream()
                    .map(u -> toUserVO(u, scores.get(u.getUsername())))
                    .sorted(Comparator
                            .comparing(UserVO::getComprehensiveScore, Comparator.nullsLast(Comparator.reverseOrder()))
                            .thenComparing(UserVO::getComprehensiveRank, Comparator.nullsLast(Comparator.naturalOrder()))
                            .thenComparing(UserVO::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                    .collect(Collectors.toList());
            return paginateUserVO(records, current, size);
        }

        wrapper.orderByAsc(User::getId);
        Page<User> page = userService.page(new Page<>(current, size), wrapper);
        Map<String, ComprehensiveScore> scores = latestComprehensiveScores(page.getRecords());
        Page<UserVO> voPage = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        voPage.setRecords(page.getRecords().stream()
                .map(u -> toUserVO(u, scores.get(u.getUsername())))
                .collect(Collectors.toList()));
        return voPage;
    }

    private UserVO toUserVO(User u) {
        return toUserVO(u, null);
    }

    private UserVO toUserVO(User u, ComprehensiveScore score) {
        UserVO vo = new UserVO();
        BeanUtils.copyProperties(u, vo);
        if (score != null) {
            vo.setComprehensiveAcademicYear(score.getAcademicYear());
            vo.setComprehensiveScore(score.getComprehensiveScore());
            vo.setComprehensiveRank(score.getComprehensiveRank());
            vo.setComprehensiveRankPercent(score.getComprehensiveRankPercent());
        }
        vo.setMajor(displayMajor(vo.getMajor()));
        return vo;
    }

    private Map<String, ComprehensiveScore> latestComprehensiveScores(List<User> users) {
        if (comprehensiveScoreService == null || CollUtil.isEmpty(users)) {
            return Collections.emptyMap();
        }
        List<String> studentNos = users.stream()
                .map(User::getUsername)
                .filter(StrUtil::isNotBlank)
                .distinct()
                .collect(Collectors.toList());
        if (CollUtil.isEmpty(studentNos)) {
            return Collections.emptyMap();
        }
        return comprehensiveScoreService.list(new LambdaQueryWrapper<ComprehensiveScore>()
                        .in(ComprehensiveScore::getStudentNo, studentNos)
                        .orderByDesc(ComprehensiveScore::getAcademicYear))
                .stream()
                .collect(Collectors.toMap(
                        ComprehensiveScore::getStudentNo,
                        score -> score,
                        (first, ignored) -> first,
                        LinkedHashMap::new
                ));
    }

    private Page<UserVO> paginateUserVO(List<UserVO> records, int current, int size) {
        int pageSize = Math.max(size, 1);
        int pageNo = Math.max(current, 1);
        int from = Math.min((pageNo - 1) * pageSize, records.size());
        int to = Math.min(from + pageSize, records.size());
        Page<UserVO> page = new Page<>(pageNo, pageSize, records.size());
        page.setRecords(records.subList(from, to));
        return page;
    }

    @Override
    public List<StudentComprehensiveVO> getComprehensiveData(String academicYear, String major) {
        String effectiveCollege = scopedCollege(null);
        if (comprehensiveScoreService != null) {
            List<ComprehensiveScoreVO> officialScores = comprehensiveScoreService.listByScope(academicYear, effectiveCollege, major);
            if (CollUtil.isNotEmpty(officialScores)) {
                return officialScores.stream()
                        .map(score -> new StudentComprehensiveVO(
                                score.getRealName(),
                                score.getStudentNo(),
                                score.getCollege(),
                                displayMajor(score.getMajor()),
                                score.getClassName(),
                                score.getComprehensiveRank(),
                                score.getComprehensiveScore() == null ? 0.0 : score.getComprehensiveScore().doubleValue()
                        ))
                        .collect(Collectors.toList());
            }
        }

        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<User>()
                .eq(User::getRole, "student")
                .eq(StrUtil.isNotBlank(effectiveCollege), User::getCollege, effectiveCollege);
        applyMajorFilter(wrapper, major);

        List<User> students = userService.list(wrapper);
        if (CollUtil.isEmpty(students)) {
            return new ArrayList<>();
        }

        // Batch-fetch all registrations for these students
        List<Long> studentIds = studentIds(students);
        LambdaQueryWrapper<Registration> regWrapper = new LambdaQueryWrapper<Registration>()
                .in(Registration::getStudentId, studentIds);

        // Apply academic year filter if provided (e.g., "2025-2026" -> Sep 1 2025 to Aug 31 2026)
        if (StrUtil.isNotBlank(academicYear) && academicYear.contains("-")) {
            String[] parts = academicYear.split("-");
            try {
                int startYear = Integer.parseInt(parts[0].trim());
                java.time.LocalDateTime startDate = java.time.LocalDateTime.of(startYear, 9, 1, 0, 0);
                java.time.LocalDateTime endDate = java.time.LocalDateTime.of(startYear + 1, 8, 31, 23, 59, 59);
                regWrapper.ge(Registration::getSubmitDate, startDate)
                           .le(Registration::getSubmitDate, endDate);
            } catch (NumberFormatException e) {
                log.debug("学年格式无效，跳过筛选: {}", e.getMessage());
            }
        }

        List<Registration> allRegs = registrationService.list(regWrapper);

        // Batch-fetch all approved submissions
        List<Long> allRegIds = allRegs.stream().map(Registration::getId).distinct().collect(Collectors.toList());
        Map<Long, List<Submission>> approvedSubsByRegId = CollUtil.isNotEmpty(allRegIds)
                ? submissionService.list(new LambdaQueryWrapper<Submission>()
                        .in(Submission::getRegistrationId, allRegIds)
                        .eq(Submission::getStatus, SubmissionStatus.REVIEWED.getValue())
                        .eq(Submission::getApproved, true))
                        .stream()
                        .filter(s -> SubmissionStatus.REVIEWED == SubmissionStatus.from(s.getStatus())
                        && Boolean.TRUE.equals(s.getApproved()))
                        .collect(Collectors.groupingBy(Submission::getRegistrationId))
                : Collections.emptyMap();

        // Group registrations by student
        Map<Long, List<Registration>> regsByStudent = allRegs.stream()
                .collect(Collectors.groupingBy(Registration::getStudentId));

        List<StudentComprehensiveVO> result = new ArrayList<>();
        for (User student : students) {
            List<Registration> studentRegs = regsByStudent.getOrDefault(student.getId(), Collections.emptyList());
            int participationCount = studentRegs.size();

            int approvedCount = 0;
            for (Registration reg : studentRegs) {
                List<Submission> subs = approvedSubsByRegId.getOrDefault(reg.getId(), Collections.emptyList());
                approvedCount += subs.size();
            }
            double score = ActivityScore.of(participationCount, approvedCount);

            result.add(new StudentComprehensiveVO(
                    student.getRealName(),
                    student.getUsername(),
                    student.getCollege(),
                    displayMajor(student.getMajor()),
                    student.getClassName(),
                    participationCount,
                    score
            ));
        }
        result.sort(Comparator.comparing(StudentComprehensiveVO::getComprehensiveScore, Comparator.reverseOrder()));
        return result;
    }

    // ---- cascade filter APIs ----

    @Override
    public List<String> listColleges() {
        String ownCollege = currentTeacherCollege();
        if (StrUtil.isNotBlank(ownCollege)) {
            return deniedCollege(ownCollege) ? new ArrayList<>() : List.of(ownCollege);
        }
        // 学院以管理员维护的专业表为准，而不是从学生档案里 distinct 出来——
        // 后者会把录入笔误和已停办的学院一起带出来，也与 /api/meta/colleges 对不上
        return majorService.listColleges();
    }

    @Override
    public List<String> listMajors(String college) {
        String effectiveCollege = scopedCollege(college);
        if (deniedCollege(effectiveCollege)) return new ArrayList<>();
        LambdaQueryWrapper<User> w = new LambdaQueryWrapper<User>()
                .eq(User::getRole, "student")
                .select(User::getMajor)
                .groupBy(User::getMajor);
        if (StrUtil.isNotBlank(effectiveCollege)) w.eq(User::getCollege, effectiveCollege);
        return userService.list(w).stream()
                .map(u -> displayMajor(u.getMajor()))
                .filter(Objects::nonNull)
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }

    @Override
    public List<String> listGrades(String college, String major) {
        String effectiveCollege = scopedCollege(college);
        if (deniedCollege(effectiveCollege)) return new ArrayList<>();
        LambdaQueryWrapper<User> w = new LambdaQueryWrapper<User>()
                .eq(User::getRole, "student")
                .select(User::getGrade)
                .groupBy(User::getGrade);
        if (StrUtil.isNotBlank(effectiveCollege)) w.eq(User::getCollege, effectiveCollege);
        applyMajorFilter(w, major);
        return userService.list(w).stream().map(User::getGrade).filter(Objects::nonNull).sorted(Comparator.reverseOrder()).collect(Collectors.toList());
    }

    @Override
    public List<String> listClasses(String college, String major, String grade) {
        String effectiveCollege = scopedCollege(college);
        String normalizedGrade = normalizeGrade(grade);
        if (deniedCollege(effectiveCollege)) return new ArrayList<>();
        LambdaQueryWrapper<User> w = new LambdaQueryWrapper<User>()
                .eq(User::getRole, "student")
                .select(User::getClassName)
                .groupBy(User::getClassName);
        if (StrUtil.isNotBlank(effectiveCollege)) w.eq(User::getCollege, effectiveCollege);
        applyMajorFilter(w, major);
        if (StrUtil.isNotBlank(normalizedGrade)) w.eq(User::getGrade, normalizedGrade);
        return userService.list(w).stream().map(User::getClassName).filter(Objects::nonNull).sorted().collect(Collectors.toList());
    }

    // ---- college overview ----

    @Override
    public Map<String, Object> getCollegeOverview(String college, String grade, String major) {
        Map<String, Object> result = new HashMap<>();

        List<User> students = userService.list(studentQuery(college, grade, major, null));
        int totalStudents = students.size();
        result.put("totalStudents", totalStudents);

        if (totalStudents == 0) {
            result.put("gradeDistribution", new HashMap<>());
            result.put("majorDistribution", new ArrayList<>());
            result.put("categoryDistribution", new HashMap<>());
            result.put("totalRegistrations", 0);
            result.put("totalApproved", 0);
            result.put("totalPending", 0);
            result.put("participationRate", 0.0);
            return result;
        }

        List<Long> sIds = studentIds(students);

        // Grade distribution
        Map<String, Long> gradeDist = students.stream()
                .filter(u -> u.getGrade() != null)
                .collect(Collectors.groupingBy(User::getGrade, Collectors.counting()));
        result.put("gradeDistribution", gradeDist);

        // Major distribution with stats
        List<Map<String, Object>> majorStats = new ArrayList<>();
        Map<String, List<User>> majorGroups = students.stream()
                .filter(u -> u.getMajor() != null)
                .collect(Collectors.groupingBy(u -> displayMajor(u.getMajor())));

        List<Registration> allRegs = registrationService.list(new LambdaQueryWrapper<Registration>()
                .in(Registration::getStudentId, sIds));
        List<Long> allRegIds = allRegs.stream().map(Registration::getId).collect(Collectors.toList());
        List<Submission> allApproved = CollUtil.isNotEmpty(allRegIds)
                ? submissionService.list(new LambdaQueryWrapper<Submission>()
                        .in(Submission::getRegistrationId, allRegIds)
                        .eq(Submission::getApproved, 1))
                : new ArrayList<>();

        // 先按学生把报名和获奖数出来，后面按专业汇总就只是查表；
        // 否则每个专业都要重扫一遍全部提交，每条提交再线性找它的报名
        Map<Long, Long> regsByStudent = allRegs.stream()
                .collect(Collectors.groupingBy(Registration::getStudentId, Collectors.counting()));
        Map<Long, Long> regIdToStudentId = allRegs.stream()
                .collect(Collectors.toMap(Registration::getId, Registration::getStudentId, (a, b) -> a));
        Map<Long, Long> awardsByStudent = allApproved.stream()
                .map(s -> regIdToStudentId.get(s.getRegistrationId()))
                .filter(Objects::nonNull)
                .collect(Collectors.groupingBy(id -> id, Collectors.counting()));

        for (Map.Entry<String, List<User>> entry : majorGroups.entrySet()) {
            String majorName = entry.getKey();
            List<User> majorStudents = entry.getValue();

            long regCount = 0;
            long awardCount = 0;
            for (User s : majorStudents) {
                regCount += regsByStudent.getOrDefault(s.getId(), 0L);
                awardCount += awardsByStudent.getOrDefault(s.getId(), 0L);
            }

            Map<String, Object> m = new HashMap<>();
            m.put("major", majorName);
            m.put("studentCount", majorStudents.size());
            m.put("registrationCount", regCount);
            m.put("awardCount", awardCount);
            m.put("participationRate", majorStudents.isEmpty() ? 0.0 : Math.round((double) regCount / majorStudents.size() * 100.0) / 100.0);
            majorStats.add(m);
        }
        result.put("majorDistribution", majorStats);

        // Category distribution (count registrations per category, not competitions)
        List<Long> compIds = allRegs.stream().map(Registration::getCompetitionId).distinct().collect(Collectors.toList());
        Map<String, Long> categoryDist = new HashMap<>();
        if (CollUtil.isNotEmpty(compIds)) {
            Map<Long, Competition> compMap = competitionService.listByIds(compIds).stream()
                    .collect(Collectors.toMap(Competition::getId, c -> c, (a, b) -> a));
            categoryDist = allRegs.stream()
                    .map(r -> compMap.get(r.getCompetitionId()))
                    .filter(Objects::nonNull)
                    .filter(c -> c.getCategory() != null)
                    .collect(Collectors.groupingBy(Competition::getCategory, Collectors.counting()));
        }
        result.put("categoryDistribution", categoryDist);

        // Totals
        long participatedStudents = allRegs.stream().map(Registration::getStudentId).distinct().count();
        result.put("totalRegistrations", allRegs.size());
        result.put("totalApproved", allApproved.size());
        result.put("totalPending", allRegs.stream()
                .filter(r -> RegistrationStatus.isReviewable(r.getStatus())).count());
        result.put("participationRate", totalStudents == 0 ? 0.0 : Math.round((double) participatedStudents / totalStudents * 100.0) / 100.0);
        result.put("perStudentAvg", totalStudents == 0 ? 0.0 : Math.round((double) allRegs.size() / totalStudents * 100.0) / 100.0);

        return result;
    }

    // ---- student detail ----

    @Override
    public Map<String, Object> getStudentDetail(Long studentId) {
        Map<String, Object> result = new HashMap<>();

        User student = userService.getById(studentId);
        if (student == null || !"student".equals(student.getRole())) {
            throw new BusinessException("学生不存在");
        }
        if (!canAccessStudent(student)) {
            throw new BusinessException(403, "无权查看该学生");
        }

        // Basic info
        Map<String, Object> info = new HashMap<>();
        info.put("id", student.getId());
        info.put("username", student.getUsername());
        info.put("realName", student.getRealName());
        info.put("college", student.getCollege());
        info.put("major", displayMajor(student.getMajor()));
        info.put("className", student.getClassName());
        info.put("grade", student.getGrade());
        result.put("student", info);

        // Registrations
        List<Registration> regs = registrationService.list(new LambdaQueryWrapper<Registration>()
                .eq(Registration::getStudentId, studentId)
                .orderByDesc(Registration::getSubmitDate));
        int totalCompetitions = regs.size();

        // Approved submissions (awards)
        List<Long> regIds = regs.stream().map(Registration::getId).collect(Collectors.toList());
        List<Submission> approvedSubs = CollUtil.isNotEmpty(regIds)
                ? submissionService.list(new LambdaQueryWrapper<Submission>()
                        .in(Submission::getRegistrationId, regIds)
                        .eq(Submission::getApproved, true))
                : new ArrayList<>();
        int totalAwards = approvedSubs.size();

        result.put("totalCompetitions", totalCompetitions);
        result.put("totalAwards", totalAwards);
        result.put("awardRate", totalCompetitions == 0 ? 0.0 : Math.round((double) totalAwards / totalCompetitions * 100.0) / 100.0);
        result.put("comprehensive", getStudentComprehensive(studentId));

        // Competition list with details
        List<Map<String, Object>> compList = new ArrayList<>();
        if (CollUtil.isNotEmpty(regs)) {
            List<Long> compIds = regs.stream().map(Registration::getCompetitionId).distinct().collect(Collectors.toList());
            Map<Long, Competition> compMap = competitionService.listByIds(compIds).stream()
                    .collect(Collectors.toMap(Competition::getId, c -> c));

            for (Registration r : regs) {
                Competition comp = compMap.get(r.getCompetitionId());
                Map<String, Object> entry = new HashMap<>();
                entry.put("registrationId", r.getId());
                entry.put("competitionId", r.getCompetitionId());
                entry.put("competitionName", comp != null ? comp.getName() : "未知赛事");
                entry.put("competitionLevel", comp != null ? comp.getLevel() : "");
                entry.put("competitionCategory", comp != null ? comp.getCategory() : "");
                entry.put("teamName", r.getTeamName());
                entry.put("status", r.getStatus());
                entry.put("submitDate", r.getSubmitDate());
                compList.add(entry);
            }
        }
        result.put("competitions", compList);

        // Growth radar (reuse GrowthRecordService logic)
        try {
            StudentGrowthVO growthData = growthRecordService.getStudentGrowth(studentId);
            result.put("radar", growthData);
        } catch (Exception e) {
            log.warn("获取学生成长数据失败: {}", e.getMessage());
            result.put("radar", null);
        }

        // Ranking within same major (batch fetch to avoid N+1)
        if (student.getMajor() != null) {
            String ownCollege = currentTeacherCollege();
            LambdaQueryWrapper<User> peerWrapper = new LambdaQueryWrapper<User>()
                    .eq(User::getRole, "student");
            applyMajorFilter(peerWrapper, student.getMajor());
            if (StrUtil.isNotBlank(ownCollege)) {
                peerWrapper.eq(User::getCollege, ownCollege);
            }
            List<User> peers = userService.list(peerWrapper);

            // Batch-fetch all registrations for all peers
            List<Long> peerIds = peers.stream().map(User::getId).collect(Collectors.toList());
            List<Registration> peerAllRegs = registrationService.list(new LambdaQueryWrapper<Registration>()
                    .in(Registration::getStudentId, peerIds));
            Map<Long, List<Registration>> regsByPeer = peerAllRegs.stream()
                    .collect(Collectors.groupingBy(Registration::getStudentId));

            // Batch-fetch all approved submissions for these registrations
            List<Long> peerRegIds = peerAllRegs.stream().map(Registration::getId).distinct().collect(Collectors.toList());
            Map<Long, Long> awardsByStudent = new HashMap<>();
            if (CollUtil.isNotEmpty(peerRegIds)) {
                List<Submission> peerApprovedSubs = submissionService.list(new LambdaQueryWrapper<Submission>()
                        .in(Submission::getRegistrationId, peerRegIds)
                        .eq(Submission::getApproved, true));
                // Map registrationId -> studentId, then count awards per student
                Map<Long, Long> regIdToStudentId = peerAllRegs.stream()
                        .collect(Collectors.toMap(Registration::getId, Registration::getStudentId, (a, b) -> a));
                awardsByStudent = peerApprovedSubs.stream()
                        .map(sub -> regIdToStudentId.get(sub.getRegistrationId()))
                        .filter(Objects::nonNull)
                        .collect(Collectors.groupingBy(id -> id, Collectors.counting()));
            }

            List<Map<String, Object>> rankings = new ArrayList<>();
            for (User peer : peers) {
                long peerRegCount = regsByPeer.getOrDefault(peer.getId(), Collections.emptyList()).size();
                long peerAwards = awardsByStudent.getOrDefault(peer.getId(), 0L);
                double score = ActivityScore.of((int) peerRegCount, (int) peerAwards);
                Map<String, Object> r = new HashMap<>();
                r.put("studentId", peer.getId());
                r.put("realName", peer.getRealName());
                r.put("score", score);
                rankings.add(r);
            }
            rankings.sort(Comparator.comparingDouble((Map<String, Object> m) -> (Double) m.get("score")).reversed());
            int rank = 0;
            for (int i = 0; i < rankings.size(); i++) {
                if (rankings.get(i).get("studentId").equals(studentId)) {
                    rank = i + 1;
                    break;
                }
            }
            result.put("rank", rank);
            result.put("rankTotal", rankings.size());
        }

        return result;
    }

    @Override
    public ComprehensiveScoreVO getStudentComprehensive(Long studentId) {
        User student = userService.getById(studentId);
        if (student == null || !"student".equals(student.getRole())) {
            throw new BusinessException("学生不存在");
        }
        if (!canAccessStudent(student)) {
            throw new BusinessException(403, "无权查看该学生");
        }
        return comprehensiveScoreService.getLatestByStudentNo(student.getUsername());
    }

    @Override
    public TeacherGrowthOverviewVO getGrowthOverview(String college, String grade, String major, String className) {
        List<User> students = userService.list(studentQuery(college, grade, major, className));
        TeacherGrowthOverviewVO overview = new TeacherGrowthOverviewVO();
        overview.setTotalStudents(students.size());
        overview.setActivityTypeDistribution(new LinkedHashMap<>());
        overview.setTotalVolunteerHours(BigDecimal.ZERO);
        overview.setAverageDimensions(defaultAverageDimensions(Map.of()));
        overview.setLowParticipationCount(0);
        overview.setLowParticipationStudents(new ArrayList<>());

        if (CollUtil.isEmpty(students)) {
            return overview;
        }

        Set<Long> studentIdSet = students.stream().map(User::getId).collect(Collectors.toSet());
        Map<Long, Integer> evidenceByStudent = students.stream()
                .collect(Collectors.toMap(User::getId, u -> 0, (a, b) -> a, LinkedHashMap::new));
        Map<String, Integer> dimensionTotals = new LinkedHashMap<>();
        dimensionTotals.put("competition_practice", 0);
        dimensionTotals.put("innovation", 0);
        dimensionTotals.put("volunteer", 0);
        dimensionTotals.put("culture_sports", 0);
        dimensionTotals.put("teamwork", 0);

        List<Long> studentIds = new ArrayList<>(studentIdSet);
        List<Registration> registrations = registrationService.list(new LambdaQueryWrapper<Registration>()
                .in(Registration::getStudentId, studentIds));
        List<Registration> approvedRegistrations = registrations.stream()
                .filter(r -> RegistrationStatus.APPROVED == RegistrationStatus.from(r.getStatus()))
                .collect(Collectors.toList());
        approvedRegistrations.forEach(reg -> {
            evidenceByStudent.computeIfPresent(reg.getStudentId(), (id, count) -> count + 1);
            addDimensionTotal(dimensionTotals, "competition_practice", 14);
            if (StrUtil.isNotBlank(reg.getTeamName()) || StrUtil.isNotBlank(reg.getMemberStudentIds())) {
                addDimensionTotal(dimensionTotals, "teamwork", 10);
            }
        });

        List<Long> approvedRegIds = approvedRegistrations.stream()
                .map(Registration::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        if (CollUtil.isNotEmpty(approvedRegIds)) {
            List<Submission> approvedSubmissions = submissionService.list(new LambdaQueryWrapper<Submission>()
                    .in(Submission::getRegistrationId, approvedRegIds)
                    .eq(Submission::getStatus, SubmissionStatus.REVIEWED.getValue())
                    .eq(Submission::getApproved, true));
            Map<Long, Long> regToStudent = approvedRegistrations.stream()
                    .collect(Collectors.toMap(Registration::getId, Registration::getStudentId, (a, b) -> a));
            approvedSubmissions.stream()
                    .filter(s -> Boolean.TRUE.equals(s.getApproved()))
                    .forEach(submission -> {
                        Long sid = regToStudent.get(submission.getRegistrationId());
                        if (sid != null) {
                            evidenceByStudent.computeIfPresent(sid, (id, count) -> count + 1);
                        }
                        addDimensionTotal(dimensionTotals, "competition_practice", 8);
                        addDimensionTotal(dimensionTotals, "innovation", 12);
                    });
        }

        List<Participation> participations = participationService.list(new LambdaQueryWrapper<Participation>()
                .in(Participation::getStudentId, studentIds));
        List<Participation> approvedParticipations = participations.stream()
                .filter(p -> "approved".equalsIgnoreCase(p.getStatus()))
                .collect(Collectors.toList());
        Map<Long, Activity> activityMap = loadActivityMap(approvedParticipations);
        Map<String, Long> activityTypeDistribution = new LinkedHashMap<>();
        BigDecimal volunteerHours = BigDecimal.ZERO;

        for (Participation participation : approvedParticipations) {
            if (!studentIdSet.contains(participation.getStudentId())) continue;
            Activity activity = activityMap.get(participation.getActivityId());
            String type = activity != null && StrUtil.isNotBlank(activity.getType()) ? activity.getType() : "other";
            activityTypeDistribution.put(type, activityTypeDistribution.getOrDefault(type, 0L) + 1L);
            evidenceByStudent.computeIfPresent(participation.getStudentId(), (id, count) -> count + 1);
            if ("volunteer".equalsIgnoreCase(type)) {
                BigDecimal hours = activity != null && activity.getServiceHours() != null ? activity.getServiceHours() : BigDecimal.ZERO;
                volunteerHours = volunteerHours.add(hours);
                addDimensionTotal(dimensionTotals, "volunteer", 20 + Math.min(20, hours.multiply(BigDecimal.valueOf(4)).intValue()));
            } else if ("culture_sports".equalsIgnoreCase(type)) {
                addDimensionTotal(dimensionTotals, "culture_sports", 26);
            } else {
                addDimensionTotal(dimensionTotals, "competition_practice", 8);
            }
            if (StrUtil.isNotBlank(participation.getTeamName()) || StrUtil.isNotBlank(participation.getMemberStudentIds())) {
                addDimensionTotal(dimensionTotals, "teamwork", 8);
            }
        }

        overview.setActivityTypeDistribution(activityTypeDistribution);
        overview.setTotalVolunteerHours(volunteerHours);
        overview.setAverageDimensions(defaultAverageDimensions(dimensionTotals, students.size()));
        List<TeacherGrowthOverviewVO.LowParticipationStudentVO> lowParticipationStudents = students.stream()
                .filter(student -> evidenceByStudent.getOrDefault(student.getId(), 0) == 0)
                .map(student -> new TeacherGrowthOverviewVO.LowParticipationStudentVO(
                        student.getId(),
                        student.getUsername(),
                        student.getRealName(),
                        displayMajor(student.getMajor()),
                        student.getClassName(),
                        evidenceByStudent.getOrDefault(student.getId(), 0)
                ))
                .collect(Collectors.toList());
        overview.setLowParticipationCount(lowParticipationStudents.size());
        overview.setLowParticipationStudents(lowParticipationStudents.stream()
                .limit(8)
                .collect(Collectors.toList()));
        return overview;
    }

    private Map<Long, Activity> loadActivityMap(List<Participation> participations) {
        List<Long> activityIds = participations.stream()
                .map(Participation::getActivityId)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
        if (CollUtil.isEmpty(activityIds) || activityService == null) {
            return Collections.emptyMap();
        }
        return activityService.listByIds(activityIds).stream()
                .collect(Collectors.toMap(Activity::getId, a -> a, (a, b) -> a));
    }

    private void addDimensionTotal(Map<String, Integer> totals, String key, int delta) {
        totals.put(key, Math.min(100, totals.getOrDefault(key, 0) + delta));
    }

    private List<GrowthDimensionVO> defaultAverageDimensions(Map<String, Integer> totals) {
        return defaultAverageDimensions(totals, 1);
    }

    private List<GrowthDimensionVO> defaultAverageDimensions(Map<String, Integer> totals, int totalStudents) {
        int divisor = Math.max(totalStudents, 1);
        return List.of(
                averageDimension("competition_practice", "竞赛实践", totals, divisor),
                averageDimension("innovation", "创新能力", totals, divisor),
                averageDimension("volunteer", "志愿公益", totals, divisor),
                averageDimension("culture_sports", "文体素养", totals, divisor),
                averageDimension("teamwork", "团队协作", totals, divisor)
        );
    }

    private GrowthDimensionVO averageDimension(String key, String label, Map<String, Integer> totals, int divisor) {
        int score = Math.min(100, Math.round((float) totals.getOrDefault(key, 0) / divisor));
        return new GrowthDimensionVO(key, label, score, 100, 0, "学院范围平均画像");
    }

    // ---- academic warning dashboard ----

    @Override
    public Map<String, Object> getAcademicWarnings(String college, String grade, String major, String className,
                                                    String riskLevel, String keyword) {
        List<User> students = userService.list(studentQuery(college, grade, major, className));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalStudents", students.size());

        if (CollUtil.isEmpty(students)) {
            result.put("syncedStudents", 0);
            result.put("unsyncedStudents", 0);
            result.put("highCount", 0);
            result.put("attentionCount", 0);
            result.put("normalCount", 0);
            result.put("unknownCount", 0);
            result.put("failedCourseCount", 0);
            result.put("missingCreditsTotal", BigDecimal.ZERO);
            result.put("records", new ArrayList<>());
            return result;
        }

        List<Long> ids = studentIds(students);
        List<StudentAcademicSnapshot> snapshots = studentAcademicSnapshotMapper.selectList(
                new LambdaQueryWrapper<StudentAcademicSnapshot>()
                        .in(StudentAcademicSnapshot::getStudentId, ids)
                        .orderByDesc(StudentAcademicSnapshot::getSyncedAt));
        Map<Long, StudentAcademicSnapshot> latestByStudent = new HashMap<>();
        for (StudentAcademicSnapshot snapshot : snapshots) {
            latestByStudent.putIfAbsent(snapshot.getStudentId(), snapshot);
        }

        List<TeacherAcademicWarningVO> allRecords = students.stream()
                .map(student -> toAcademicWarning(student, latestByStudent.get(student.getId())))
                .sorted(Comparator
                        .comparingInt((TeacherAcademicWarningVO item) -> academicRiskWeight(item.getRiskLevel())).reversed()
                        .thenComparing(TeacherAcademicWarningVO::getFailedCourses, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(TeacherAcademicWarningVO::getMissingCredits, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(TeacherAcademicWarningVO::getRealName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .collect(Collectors.toList());

        List<TeacherAcademicWarningVO> records = allRecords.stream()
                .filter(item -> StrUtil.isBlank(riskLevel) || riskLevel.equalsIgnoreCase(item.getRiskLevel()))
                .filter(item -> StrUtil.isBlank(keyword) || matchesAcademicKeyword(item, keyword))
                .collect(Collectors.toList());

        result.put("syncedStudents", allRecords.stream().filter(item -> item.getSyncedAt() != null).count());
        result.put("unsyncedStudents", allRecords.stream().filter(item -> item.getSyncedAt() == null).count());
        result.put("highCount", allRecords.stream().filter(item -> "high".equals(item.getRiskLevel())).count());
        result.put("attentionCount", allRecords.stream().filter(item -> "attention".equals(item.getRiskLevel())).count());
        result.put("normalCount", allRecords.stream().filter(item -> "normal".equals(item.getRiskLevel())).count());
        result.put("unknownCount", allRecords.stream().filter(item -> "unknown".equals(item.getRiskLevel())).count());
        result.put("failedCourseCount", allRecords.stream().mapToInt(item -> item.getFailedCourses() == null ? 0 : item.getFailedCourses()).sum());
        result.put("missingCreditsTotal", allRecords.stream()
                .map(TeacherAcademicWarningVO::getMissingCredits)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add));
        result.put("records", records);
        return result;
    }

    private TeacherAcademicWarningVO toAcademicWarning(User student, StudentAcademicSnapshot snapshot) {
        TeacherAcademicWarningVO item = new TeacherAcademicWarningVO();
        item.setStudentId(student.getId());
        item.setUsername(student.getUsername());
        item.setRealName(student.getRealName());
        item.setCollege(student.getCollege());
        item.setMajor(displayMajor(student.getMajor()));
        item.setClassName(student.getClassName());
        item.setGrade(student.getGrade());

        List<AcademicRiskVO> risks = new ArrayList<>();
        if (snapshot == null) {
            risks.add(academicRisk("unknown", "尚未同步教务数据", "该学生还没有可用于风险判断的成绩与培养方案数据。"));
            item.setRiskLevel("unknown");
            item.setRiskLabel(academicRiskLabel("unknown"));
            item.setRisks(risks);
            return item;
        }

        item.setGpa(snapshot.getGpa());
        item.setRequiredCredits(snapshot.getRequiredCredits());
        item.setEarnedCredits(snapshot.getEarnedCredits());
        item.setMissingCredits(snapshot.getMissingCredits());
        item.setFailedCourses(snapshot.getPlannedFailedCourses());
        item.setMissedCourses(snapshot.getPlannedMissedCourses());
        item.setInProgressCourses(snapshot.getPlannedInProgressCourses());
        item.setSyncedAt(snapshot.getSyncedAt());

        BigDecimal missingCredits = snapshot.getMissingCredits() == null ? BigDecimal.ZERO : snapshot.getMissingCredits();
        int failedCourses = snapshot.getPlannedFailedCourses() == null ? 0 : snapshot.getPlannedFailedCourses();
        int missedCourses = snapshot.getPlannedMissedCourses() == null ? 0 : snapshot.getPlannedMissedCourses();
        BigDecimal gpa = snapshot.getGpa();

        if (missingCredits.compareTo(BigDecimal.ZERO) > 0) {
            String level = missingCredits.compareTo(BigDecimal.valueOf(12)) >= 0 ? "high" : "attention";
            risks.add(academicRisk(level, "培养方案仍有学分缺口", "当前还缺 " + missingCredits.stripTrailingZeros().toPlainString() + " 学分。"));
        }
        if (failedCourses > 0) {
            String level = failedCourses >= 3 ? "high" : "attention";
            risks.add(academicRisk(level, "存在未通过课程", "培养方案内有 " + failedCourses + " 门课程尚未通过。"));
        }
        if (missedCourses > 0) {
            risks.add(academicRisk("attention", "存在未修课程", "培养方案内有 " + missedCourses + " 门课程尚未修读。"));
        }
        if (gpa != null && gpa.compareTo(BigDecimal.valueOf(2)) < 0) {
            String level = gpa.compareTo(BigDecimal.valueOf(1.5)) < 0 ? "high" : "attention";
            risks.add(academicRisk(level, "平均学分绩点偏低", "当前 GPA 为 " + gpa.stripTrailingZeros().toPlainString() + "，建议关注后续课程表现。"));
        }
        if (risks.isEmpty()) {
            risks.add(academicRisk("normal", "当前未发现明显风险", "最近一次同步的学分、课程和 GPA 指标处于正常范围。"));
        }

        String resolvedLevel = risks.stream()
                .map(AcademicRiskVO::getLevel)
                .max(Comparator.comparingInt(this::academicRiskWeight))
                .orElse("unknown");
        if (academicRiskWeight(snapshot.getRiskLevel()) > academicRiskWeight(resolvedLevel)) {
            resolvedLevel = snapshot.getRiskLevel();
        }
        item.setRiskLevel(resolvedLevel);
        item.setRiskLabel(academicRiskLabel(resolvedLevel));
        item.setRisks(risks);
        return item;
    }

    private AcademicRiskVO academicRisk(String level, String title, String detail) {
        AcademicRiskVO risk = new AcademicRiskVO();
        risk.setLevel(level);
        risk.setTitle(title);
        risk.setDetail(detail);
        return risk;
    }

    private int academicRiskWeight(String level) {
        if ("high".equalsIgnoreCase(level)) return 3;
        if ("attention".equalsIgnoreCase(level)) return 2;
        if ("normal".equalsIgnoreCase(level)) return 1;
        return 0;
    }

    private String academicRiskLabel(String level) {
        if ("high".equalsIgnoreCase(level)) return "高风险";
        if ("attention".equalsIgnoreCase(level)) return "需要关注";
        if ("normal".equalsIgnoreCase(level)) return "情况正常";
        return "待同步";
    }

    private boolean matchesAcademicKeyword(TeacherAcademicWarningVO item, String keyword) {
        String normalized = keyword == null ? "" : keyword.trim().toLowerCase(Locale.ROOT);
        if (normalized.isEmpty()) return true;
        return Stream.of(item.getRealName(), item.getUsername(), item.getMajor(), item.getClassName())
                .filter(Objects::nonNull)
                .map(value -> value.toLowerCase(Locale.ROOT))
                .anyMatch(value -> value.contains(normalized));
    }

    // ---- trend ----

    @Override
    public Map<String, Object> getTrend(String college, String grade, String major) {
        Map<String, Object> result = new HashMap<>();

        List<User> students = userService.list(studentQuery(college, grade, major, null));
        if (CollUtil.isEmpty(students)) {
            result.put("monthly", new ArrayList<>());
            return result;
        }

        List<Long> sIds = studentIds(students);
        List<Registration> regs = registrationService.list(new LambdaQueryWrapper<Registration>()
                .in(Registration::getStudentId, sIds));

        // Group by month (yyyy-MM)
        Map<String, Long> monthly = regs.stream()
                .filter(r -> r.getSubmitDate() != null)
                .collect(Collectors.groupingBy(
                        r -> String.format("%d-%02d", r.getSubmitDate().getYear(), r.getSubmitDate().getMonthValue()),
                        Collectors.counting()
                ));

        List<Map<String, Object>> monthlyList = monthly.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("month", e.getKey());
                    m.put("count", e.getValue());
                    return m;
                })
                .collect(Collectors.toList());

        result.put("monthly", monthlyList);
        return result;
    }

    // ---- student export data ----

    @Override
    public Map<String, Object> getStudentExportData(Long studentId) {
        return getStudentDetail(studentId);
    }
}
