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
import com.etsaion.exception.BusinessException;
import com.etsaion.service.*;
import com.etsaion.utils.UserContext;
import com.etsaion.vo.*;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

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

    // ---- helpers ----

    private boolean isTeacherScopedRole() {
        String role = UserContext.getUserRole();
        return "teacher".equalsIgnoreCase(role) || "counselor".equalsIgnoreCase(role);
    }

    private String currentTeacherCollege() {
        if (!isTeacherScopedRole() || UserContext.getUserId() == null) {
            return null;
        }
        User teacher = userService.getById(UserContext.getUserId());
        return teacher != null ? teacher.getCollege() : null;
    }

    private String scopedCollege(String requestedCollege) {
        String ownCollege = currentTeacherCollege();
        if (StrUtil.isBlank(ownCollege)) {
            return requestedCollege;
        }
        if (StrUtil.isBlank(requestedCollege)) {
            return ownCollege;
        }
        return ownCollege.equals(requestedCollege) ? requestedCollege : "__NO_ACCESS__";
    }

    private boolean deniedCollege(String college) {
        return "__NO_ACCESS__".equals(college);
    }

    private boolean canAccessStudent(User student) {
        String ownCollege = currentTeacherCollege();
        return StrUtil.isBlank(ownCollege) || (student != null && ownCollege.equals(student.getCollege()));
    }

    private LambdaQueryWrapper<User> studentQuery(String college, String grade, String major, String className) {
        String effectiveCollege = scopedCollege(college);
        LambdaQueryWrapper<User> w = new LambdaQueryWrapper<User>().eq(User::getRole, "student");
        if (StrUtil.isNotBlank(effectiveCollege)) w.eq(User::getCollege, effectiveCollege);
        if (StrUtil.isNotBlank(grade))      w.eq(User::getGrade, grade);
        if (StrUtil.isNotBlank(major))      w.eq(User::getMajor, major);
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

        List<Long> regIds = regs.stream().map(Registration::getId).collect(Collectors.toList());
        long pendingReviews = 0;
        if (CollUtil.isNotEmpty(regIds)) {
            pendingReviews = submissionService.count(new LambdaQueryWrapper<Submission>()
                    .in(Submission::getRegistrationId, regIds)
                    .eq(Submission::getStatus, "待审核"));
        }
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

        boolean needStudentFilter = StrUtil.isNotBlank(studentName) || StrUtil.isNotBlank(className)
                || StrUtil.isNotBlank(effectiveCollege) || StrUtil.isNotBlank(grade) || StrUtil.isNotBlank(major);

        List<Long> studentIds = null;
        if (needStudentFilter) {
            LambdaQueryWrapper<User> userWrapper = new LambdaQueryWrapper<User>()
                    .eq(User::getRole, "student")
                    .like(StrUtil.isNotBlank(studentName), User::getRealName, studentName)
                    .eq(StrUtil.isNotBlank(className), User::getClassName, className)
                    .eq(StrUtil.isNotBlank(effectiveCollege), User::getCollege, effectiveCollege)
                    .eq(StrUtil.isNotBlank(grade), User::getGrade, grade)
                    .eq(StrUtil.isNotBlank(major), User::getMajor, major);

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
    public List<UserVO> listStudents(String keyword, String college, String className, String grade, String major) {
        String effectiveCollege = scopedCollege(college);
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<User>()
                .eq(User::getRole, "student")
                .eq(StrUtil.isNotBlank(effectiveCollege), User::getCollege, effectiveCollege)
                .eq(StrUtil.isNotBlank(className), User::getClassName, className)
                .eq(StrUtil.isNotBlank(grade), User::getGrade, grade)
                .eq(StrUtil.isNotBlank(major), User::getMajor, major);

        if (StrUtil.isNotBlank(keyword)) {
            wrapper.and(w -> w.like(User::getRealName, keyword)
                              .or().like(User::getUsername, keyword)
                              .or().like(User::getMajor, keyword));
        }
        wrapper.orderByAsc(User::getId);

        return userService.list(wrapper).stream().map(u -> {
            UserVO vo = new UserVO();
            BeanUtils.copyProperties(u, vo);
            return vo;
        }).collect(Collectors.toList());
    }

    @Override
    public List<StudentComprehensiveVO> getComprehensiveData(String academicYear, String major) {
        String effectiveCollege = scopedCollege(null);
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<User>()
                .eq(User::getRole, "student")
                .eq(StrUtil.isNotBlank(effectiveCollege), User::getCollege, effectiveCollege)
                .eq(StrUtil.isNotBlank(major), User::getMajor, major);

        List<User> students = userService.list(wrapper);
        if (CollUtil.isEmpty(students)) {
            return new ArrayList<>();
        }

        List<StudentComprehensiveVO> result = new ArrayList<>();
        for (User student : students) {
            List<Registration> regs = registrationService.list(new LambdaQueryWrapper<Registration>()
                    .eq(Registration::getStudentId, student.getId()));
            int participationCount = regs.size();

            double score = participationCount * 2.0;
            List<Long> regIds = regs.stream().map(Registration::getId).collect(Collectors.toList());
            if (CollUtil.isNotEmpty(regIds)) {
                List<Submission> approvedSubs = submissionService.list(new LambdaQueryWrapper<Submission>()
                        .in(Submission::getRegistrationId, regIds)
                        .eq(Submission::getStatus, "已审核")
                        .eq(Submission::getApproved, true))
                        .stream()
                        .filter(sub -> Boolean.TRUE.equals(sub.getApproved()))
                        .collect(Collectors.toList());
                score += approvedSubs.size() * 15.0;
            }

            result.add(new StudentComprehensiveVO(
                    student.getRealName(),
                    student.getUsername(),
                    student.getCollege(),
                    student.getMajor(),
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
            return List.of(ownCollege);
        }
        return userService.list(new LambdaQueryWrapper<User>()
                .eq(User::getRole, "student")
                .select(User::getCollege)
                .groupBy(User::getCollege))
                .stream().map(User::getCollege).filter(Objects::nonNull).sorted().collect(Collectors.toList());
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
        return userService.list(w).stream().map(User::getMajor).filter(Objects::nonNull).sorted().collect(Collectors.toList());
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
        if (StrUtil.isNotBlank(major))   w.eq(User::getMajor, major);
        return userService.list(w).stream().map(User::getGrade).filter(Objects::nonNull).sorted(Comparator.reverseOrder()).collect(Collectors.toList());
    }

    @Override
    public List<String> listClasses(String college, String major, String grade) {
        String effectiveCollege = scopedCollege(college);
        if (deniedCollege(effectiveCollege)) return new ArrayList<>();
        LambdaQueryWrapper<User> w = new LambdaQueryWrapper<User>()
                .eq(User::getRole, "student")
                .select(User::getClassName)
                .groupBy(User::getClassName);
        if (StrUtil.isNotBlank(effectiveCollege)) w.eq(User::getCollege, effectiveCollege);
        if (StrUtil.isNotBlank(major))   w.eq(User::getMajor, major);
        if (StrUtil.isNotBlank(grade))   w.eq(User::getGrade, grade);
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
                .collect(Collectors.groupingBy(User::getMajor));

        List<Registration> allRegs = registrationService.list(new LambdaQueryWrapper<Registration>()
                .in(Registration::getStudentId, sIds));
        List<Long> allRegIds = allRegs.stream().map(Registration::getId).collect(Collectors.toList());
        List<Submission> allApproved = CollUtil.isNotEmpty(allRegIds)
                ? submissionService.list(new LambdaQueryWrapper<Submission>()
                        .in(Submission::getRegistrationId, allRegIds)
                        .eq(Submission::getApproved, 1))
                : new ArrayList<>();

        for (Map.Entry<String, List<User>> entry : majorGroups.entrySet()) {
            String majorName = entry.getKey();
            List<User> majorStudents = entry.getValue();
            Set<Long> majorStudentIds = majorStudents.stream().map(User::getId).collect(Collectors.toSet());

            long regCount = allRegs.stream().filter(r -> majorStudentIds.contains(r.getStudentId())).count();
            long awardCount = allApproved.stream().filter(s -> {
                Registration reg = allRegs.stream().filter(r -> r.getId().equals(s.getRegistrationId())).findFirst().orElse(null);
                return reg != null && majorStudentIds.contains(reg.getStudentId());
            }).count();

            Map<String, Object> m = new HashMap<>();
            m.put("major", majorName);
            m.put("studentCount", majorStudents.size());
            m.put("registrationCount", regCount);
            m.put("awardCount", awardCount);
            m.put("participationRate", majorStudents.isEmpty() ? 0.0 : Math.round((double) regCount / majorStudents.size() * 100.0) / 100.0);
            majorStats.add(m);
        }
        result.put("majorDistribution", majorStats);

        // Category distribution
        List<Long> compIds = allRegs.stream().map(Registration::getCompetitionId).distinct().collect(Collectors.toList());
        Map<String, Long> categoryDist = new HashMap<>();
        if (CollUtil.isNotEmpty(compIds)) {
            List<Competition> comps = competitionService.listByIds(compIds);
            categoryDist = comps.stream()
                    .filter(c -> c.getCategory() != null)
                    .collect(Collectors.groupingBy(Competition::getCategory, Collectors.counting()));
        }
        result.put("categoryDistribution", categoryDist);

        // Totals
        long participatedStudents = allRegs.stream().map(Registration::getStudentId).distinct().count();
        result.put("totalRegistrations", allRegs.size());
        result.put("totalApproved", allApproved.size());
        result.put("totalPending", allRegs.stream().filter(r -> "已提交".equals(r.getStatus()) || "审核中".equals(r.getStatus())).count());
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
        info.put("major", student.getMajor());
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
                        .eq(Submission::getApproved, 1))
                : new ArrayList<>();
        int totalAwards = approvedSubs.size();

        result.put("totalCompetitions", totalCompetitions);
        result.put("totalAwards", totalAwards);
        result.put("awardRate", totalCompetitions == 0 ? 0.0 : Math.round((double) totalAwards / totalCompetitions * 100.0) / 100.0);

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
            result.put("radar", null);
        }

        // Ranking within same major
        if (student.getMajor() != null) {
            String ownCollege = currentTeacherCollege();
            LambdaQueryWrapper<User> peerWrapper = new LambdaQueryWrapper<User>()
                    .eq(User::getRole, "student")
                    .eq(User::getMajor, student.getMajor());
            if (StrUtil.isNotBlank(ownCollege)) {
                peerWrapper.eq(User::getCollege, ownCollege);
            }
            List<User> peers = userService.list(peerWrapper);

            List<Map<String, Object>> rankings = new ArrayList<>();
            for (User peer : peers) {
                long peerRegs = registrationService.count(new LambdaQueryWrapper<Registration>()
                        .eq(Registration::getStudentId, peer.getId()));
                List<Long> peerRegIds = registrationService.list(new LambdaQueryWrapper<Registration>()
                        .eq(Registration::getStudentId, peer.getId()))
                        .stream().map(Registration::getId).collect(Collectors.toList());
                long peerAwards = CollUtil.isNotEmpty(peerRegIds)
                        ? submissionService.count(new LambdaQueryWrapper<Submission>()
                                .in(Submission::getRegistrationId, peerRegIds)
                                .eq(Submission::getApproved, 1))
                        : 0;
                double score = peerRegs * 2.0 + peerAwards * 15.0;
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
