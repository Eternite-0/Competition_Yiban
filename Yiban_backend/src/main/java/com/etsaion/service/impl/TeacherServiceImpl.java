package com.etsaion.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.map.MapUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.etsaion.entity.Submission;
import com.etsaion.entity.Registration;
import com.etsaion.entity.User;
import com.etsaion.exception.BusinessException;
import com.etsaion.service.SubmissionService;
import com.etsaion.service.RegistrationService;
import com.etsaion.service.TeacherService;
import com.etsaion.service.UserService;
import com.etsaion.vo.RegistrationVO;
import com.etsaion.vo.StudentComprehensiveVO;
import com.etsaion.vo.UserVO;
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

    @Override
    public Map<String, Object> getDashboardStats(String college) {
        Map<String, Object> stats = new HashMap<>();

        // 1. Calculate student count
        LambdaQueryWrapper<User> userWrapper = new LambdaQueryWrapper<User>()
                .eq(User::getRole, "student");
        if (StrUtil.isNotBlank(college)) {
            userWrapper.eq(User::getCollege, college);
        }
        List<User> students = userService.list(userWrapper);
        int totalStudents = students.size();
        stats.put("totalStudents", totalStudents);

        if (totalStudents == 0) {
            stats.put("totalRegistrations", 0);
            stats.put("activeCoefficient", 0.0);
            stats.put("pendingReviews", 0);
            return stats;
        }

        // 2. Fetch registrations for these students
        List<Long> studentIds = students.stream().map(User::getId).collect(Collectors.toList());
        List<Registration> regs = registrationService.list(new LambdaQueryWrapper<Registration>()
                .in(Registration::getStudentId, studentIds));
        
        int totalRegistrations = regs.size();
        stats.put("totalRegistrations", totalRegistrations);

        // 3. Active coefficient (registrations per student)
        double activeCoeff = Math.round(((double) totalRegistrations / totalStudents) * 100.0) / 100.0;
        stats.put("activeCoefficient", activeCoeff);

        // 4. Pending submissions for these students
        List<Long> regIds = regs.stream().map(Registration::getId).collect(Collectors.toList());
        long pendingReviews = 0;
        if (CollUtil.isNotEmpty(regIds)) {
            pendingReviews = submissionService.count(new LambdaQueryWrapper<Submission>()
                    .in(Submission::getRegistrationId, regIds)
                    .eq(Submission::getStatus, "待审核"));
        }
        stats.put("pendingReviews", pendingReviews);

        // 5. Build recent signup activity feed
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
    public Page<RegistrationVO> monitorStudentEvents(int current, int size, String studentName, String status, String className) {
        Page<Registration> page = new Page<>(current, size);
        LambdaQueryWrapper<Registration> wrapper = new LambdaQueryWrapper<>();

        List<Long> studentIds = null;
        if (StrUtil.isNotBlank(studentName) || StrUtil.isNotBlank(className)) {
            LambdaQueryWrapper<User> userWrapper = new LambdaQueryWrapper<User>()
                    .eq(User::getRole, "student")
                    .like(StrUtil.isNotBlank(studentName), User::getRealName, studentName)
                    .eq(StrUtil.isNotBlank(className), User::getClassName, className);

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
    public List<UserVO> listStudents(String keyword, String college, String className) {
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<User>()
                .eq(User::getRole, "student")
                .eq(StrUtil.isNotBlank(college), User::getCollege, college)
                .eq(StrUtil.isNotBlank(className), User::getClassName, className);

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
        // Query target student body
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<User>()
                .eq(User::getRole, "student")
                .eq(StrUtil.isNotBlank(major), User::getMajor, major);
        
        List<User> students = userService.list(wrapper);
        if (CollUtil.isEmpty(students)) {
            return new ArrayList<>();
        }

        List<StudentComprehensiveVO> result = new ArrayList<>();

        for (User student : students) {
            // 1. Calculate participation count
            List<Registration> regs = registrationService.list(new LambdaQueryWrapper<Registration>()
                    .eq(Registration::getStudentId, student.getId()));
            
            int participationCount = regs.size();

            // 2. Calculate comprehensive score
            double score = 0.0;
            // Base participation score (+2 per signup)
            score += (participationCount * 2.0);

            // Fetch approved submissions
            List<Long> regIds = regs.stream().map(Registration::getId).collect(Collectors.toList());
            List<Submission> approvedSubs = new ArrayList<>();
            if (CollUtil.isNotEmpty(regIds)) {
                approvedSubs = submissionService.list(new LambdaQueryWrapper<Submission>()
                        .in(Submission::getRegistrationId, regIds)
                        .eq(Submission::getStatus, "已审核"));
            }

            for (Submission sub : approvedSubs) {
                // Each approved submission adds points
                score += 15.0; // simple mock score boost
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

        // Sort by score descending
        result.sort(Comparator.comparing(StudentComprehensiveVO::getComprehensiveScore, Comparator.reverseOrder()));
        return result;
    }
}
