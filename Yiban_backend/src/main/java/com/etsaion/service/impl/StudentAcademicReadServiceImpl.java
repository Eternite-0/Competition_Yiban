package com.etsaion.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.etsaion.entity.StudentAcademicCourse;
import com.etsaion.entity.StudentAcademicCreditRequirement;
import com.etsaion.entity.StudentAcademicExam;
import com.etsaion.entity.StudentAcademicGrade;
import com.etsaion.entity.StudentAcademicNotice;
import com.etsaion.entity.StudentAcademicSchedule;
import com.etsaion.entity.StudentAcademicSnapshot;
import com.etsaion.entity.StudentAcademicSync;
import com.etsaion.mapper.StudentAcademicCourseMapper;
import com.etsaion.mapper.StudentAcademicCreditRequirementMapper;
import com.etsaion.mapper.StudentAcademicExamMapper;
import com.etsaion.mapper.StudentAcademicGradeMapper;
import com.etsaion.mapper.StudentAcademicNoticeMapper;
import com.etsaion.mapper.StudentAcademicScheduleMapper;
import com.etsaion.mapper.StudentAcademicSnapshotMapper;
import com.etsaion.mapper.StudentAcademicSyncMapper;
import com.etsaion.service.StudentAcademicReadService;
import com.etsaion.vo.AcademicRiskVO;
import com.etsaion.vo.AcademicTermVO;
import com.etsaion.vo.StudentAcademicDashboardVO;
import com.etsaion.vo.StudentAcademicSnapshotVO;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class StudentAcademicReadServiceImpl implements StudentAcademicReadService {
    private final StudentAcademicSnapshotMapper snapshotMapper;
    private final StudentAcademicSyncMapper syncMapper;
    private final StudentAcademicCreditRequirementMapper creditRequirementMapper;
    private final StudentAcademicCourseMapper courseMapper;
    private final StudentAcademicGradeMapper gradeMapper;
    private final StudentAcademicScheduleMapper scheduleMapper;
    private final StudentAcademicExamMapper examMapper;
    private final StudentAcademicNoticeMapper noticeMapper;

    public StudentAcademicReadServiceImpl(
            StudentAcademicSnapshotMapper snapshotMapper,
            StudentAcademicSyncMapper syncMapper,
            StudentAcademicCreditRequirementMapper creditRequirementMapper,
            StudentAcademicCourseMapper courseMapper,
            StudentAcademicGradeMapper gradeMapper,
            StudentAcademicScheduleMapper scheduleMapper,
            StudentAcademicExamMapper examMapper,
            StudentAcademicNoticeMapper noticeMapper) {
        this.snapshotMapper = snapshotMapper;
        this.syncMapper = syncMapper;
        this.creditRequirementMapper = creditRequirementMapper;
        this.courseMapper = courseMapper;
        this.gradeMapper = gradeMapper;
        this.scheduleMapper = scheduleMapper;
        this.examMapper = examMapper;
        this.noticeMapper = noticeMapper;
    }

    @Override
    public StudentAcademicDashboardVO getDashboard(Long studentId, String academicYear, String term) {
        StudentAcademicDashboardVO dashboard = new StudentAcademicDashboardVO();
        StudentAcademicSnapshot snapshot = latestSnapshot(studentId);
        if (snapshot == null) {
            return dashboard;
        }

        Long syncId = snapshot.getSyncId() != null ? snapshot.getSyncId() : latestSuccessfulSyncId(studentId);
        dashboard.setSummary(toSummary(snapshot));
        dashboard.setCreditRequirements(creditRequirementMapper.selectList(new LambdaQueryWrapper<StudentAcademicCreditRequirement>()
                .eq(StudentAcademicCreditRequirement::getSnapshotId, snapshot.getId())
                .orderByAsc(StudentAcademicCreditRequirement::getSortOrder)
                .orderByAsc(StudentAcademicCreditRequirement::getRequirementName)));
        dashboard.setPlanCourses(courseMapper.selectList(new LambdaQueryWrapper<StudentAcademicCourse>()
                .eq(StudentAcademicCourse::getSnapshotId, snapshot.getId())
                .orderByDesc(StudentAcademicCourse::getNeedsAttention)
                .orderByAsc(StudentAcademicCourse::getDisplayTerm)
                .orderByAsc(StudentAcademicCourse::getCourseName)));

        if (syncId == null) {
            return dashboard;
        }

        boolean hasYear = hasText(academicYear);
        boolean hasTerm = hasText(term);
        dashboard.setGrades(gradeMapper.selectList(new LambdaQueryWrapper<StudentAcademicGrade>()
                .eq(StudentAcademicGrade::getSyncId, syncId)
                .eq(hasYear, StudentAcademicGrade::getAcademicYear, academicYear)
                .eq(hasTerm, StudentAcademicGrade::getTerm, term)
                .orderByAsc(StudentAcademicGrade::getCourseName)));
        dashboard.setSchedules(scheduleMapper.selectList(new LambdaQueryWrapper<StudentAcademicSchedule>()
                .eq(StudentAcademicSchedule::getSyncId, syncId)
                .eq(hasYear, StudentAcademicSchedule::getAcademicYear, academicYear)
                .eq(hasTerm, StudentAcademicSchedule::getTerm, term)
                .orderByAsc(StudentAcademicSchedule::getWeekday)
                .orderByAsc(StudentAcademicSchedule::getStartTime)
                .orderByAsc(StudentAcademicSchedule::getCourseName)));
        dashboard.setExams(examMapper.selectList(new LambdaQueryWrapper<StudentAcademicExam>()
                .eq(StudentAcademicExam::getSyncId, syncId)
                .eq(hasYear, StudentAcademicExam::getAcademicYear, academicYear)
                .eq(hasTerm, StudentAcademicExam::getTerm, term)
                .orderByAsc(StudentAcademicExam::getExamTime)));
        dashboard.setNotices(noticeMapper.selectList(new LambdaQueryWrapper<StudentAcademicNotice>()
                .eq(StudentAcademicNotice::getSyncId, syncId)
                .orderByDesc(StudentAcademicNotice::getPublishedAt)
                .last("LIMIT 20")));
        return dashboard;
    }

    @Override
    public List<AcademicTermVO> listTerms(Long studentId) {
        StudentAcademicSnapshot snapshot = latestSnapshot(studentId);
        if (snapshot == null) {
            return new ArrayList<>();
        }
        Long syncId = snapshot.getSyncId() != null ? snapshot.getSyncId() : latestSuccessfulSyncId(studentId);
        if (syncId == null) {
            return new ArrayList<>();
        }

        Map<String, AcademicTermVO> terms = new LinkedHashMap<>();
        gradeMapper.selectList(new LambdaQueryWrapper<StudentAcademicGrade>()
                        .eq(StudentAcademicGrade::getSyncId, syncId))
                .forEach(row -> addTerm(terms, row.getAcademicYear(), row.getTerm()));
        scheduleMapper.selectList(new LambdaQueryWrapper<StudentAcademicSchedule>()
                        .eq(StudentAcademicSchedule::getSyncId, syncId))
                .forEach(row -> addTerm(terms, row.getAcademicYear(), row.getTerm()));
        examMapper.selectList(new LambdaQueryWrapper<StudentAcademicExam>()
                        .eq(StudentAcademicExam::getSyncId, syncId))
                .forEach(row -> addTerm(terms, row.getAcademicYear(), row.getTerm()));

        List<AcademicTermVO> result = new ArrayList<>(terms.values());
        result.sort(Comparator.comparing((AcademicTermVO item) -> item.getAcademicYear() == null ? "" : item.getAcademicYear())
                .thenComparing(item -> item.getTerm() == null ? "" : item.getTerm())
                .reversed());
        return result;
    }

    private StudentAcademicSnapshot latestSnapshot(Long studentId) {
        return snapshotMapper.selectOne(new LambdaQueryWrapper<StudentAcademicSnapshot>()
                .eq(StudentAcademicSnapshot::getStudentId, studentId)
                .orderByDesc(StudentAcademicSnapshot::getSyncedAt)
                .last("LIMIT 1"));
    }

    private Long latestSuccessfulSyncId(Long studentId) {
        StudentAcademicSync sync = syncMapper.selectOne(new LambdaQueryWrapper<StudentAcademicSync>()
                .eq(StudentAcademicSync::getStudentId, studentId)
                .eq(StudentAcademicSync::getStatus, "success")
                .orderByDesc(StudentAcademicSync::getFinishedAt)
                .last("LIMIT 1"));
        return sync == null ? null : sync.getId();
    }

    private StudentAcademicSnapshotVO toSummary(StudentAcademicSnapshot snapshot) {
        StudentAcademicSnapshotVO summary = new StudentAcademicSnapshotVO();
        BeanUtils.copyProperties(snapshot, summary);
        List<AcademicRiskVO> risks = new ArrayList<>();
        BigDecimal missingCredits = zeroIfNull(snapshot.getMissingCredits());
        int failedCourses = zeroIfNull(snapshot.getPlannedFailedCourses());
        int missedCourses = zeroIfNull(snapshot.getPlannedMissedCourses());
        BigDecimal gpa = snapshot.getGpa();

        if (missingCredits.compareTo(BigDecimal.ZERO) > 0) {
            risks.add(risk(missingCredits.compareTo(BigDecimal.valueOf(12)) >= 0 ? "high" : "attention",
                    "仍有学分缺口", "当前培养方案尚差 " + missingCredits.stripTrailingZeros().toPlainString() + " 学分。"));
        }
        if (failedCourses > 0) {
            risks.add(risk(failedCourses >= 3 ? "high" : "attention",
                    "存在未通过课程", "培养方案内有 " + failedCourses + " 门课程尚未通过。"));
        }
        if (missedCourses > 0) {
            risks.add(risk("attention", "存在未修课程", "培养方案内有 " + missedCourses + " 门课程尚未修读。"));
        }
        if (gpa != null && gpa.compareTo(BigDecimal.valueOf(2)) < 0) {
            risks.add(risk(gpa.compareTo(BigDecimal.valueOf(1.5)) < 0 ? "high" : "attention",
                    "平均学分绩点偏低", "当前 GPA 为 " + gpa.stripTrailingZeros().toPlainString() + "，建议关注后续课程表现。"));
        }
        if (risks.isEmpty() && snapshot.getRequiredCredits() != null) {
            risks.add(risk("normal", "学业情况正常", "当前已同步的培养方案数据未发现明显缺口。"));
        }
        if (risks.isEmpty()) {
            risks.add(risk("unknown", "数据尚不完整", "本次同步未返回完整的培养方案统计，请稍后重新同步。"));
        }
        summary.setRisks(risks);
        if (!hasText(summary.getRiskLevel()) || "unknown".equals(summary.getRiskLevel())) {
            summary.setRiskLevel(resolveRiskLevel(risks));
        }
        return summary;
    }

    private AcademicRiskVO risk(String level, String title, String detail) {
        AcademicRiskVO risk = new AcademicRiskVO();
        risk.setLevel(level);
        risk.setTitle(title);
        risk.setDetail(detail);
        return risk;
    }

    private String resolveRiskLevel(List<AcademicRiskVO> risks) {
        if (risks.stream().anyMatch(item -> "high".equals(item.getLevel()))) return "high";
        if (risks.stream().anyMatch(item -> "attention".equals(item.getLevel()))) return "attention";
        if (risks.stream().anyMatch(item -> "normal".equals(item.getLevel()))) return "normal";
        return "unknown";
    }

    private BigDecimal zeroIfNull(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private int zeroIfNull(Integer value) {
        return value == null ? 0 : value;
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private void addTerm(Map<String, AcademicTermVO> terms, String year, String term) {
        if (!hasText(year)) return;
        String key = year + "|" + (term == null ? "" : term);
        terms.putIfAbsent(key, new AcademicTermVO(year, term, formatTermLabel(year, term)));
    }

    private String formatTermLabel(String academicYear, String term) {
        if ("1".equals(term) || "3".equals(term)) return academicYear + " · 第一学期";
        if ("2".equals(term) || "12".equals(term)) return academicYear + " · 第二学期";
        return hasText(term) ? academicYear + " · " + term : academicYear;
    }
}
