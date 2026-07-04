package com.etsaion.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.etsaion.entity.ComprehensiveScore;
import com.etsaion.mapper.ComprehensiveScoreMapper;
import com.etsaion.service.ComprehensiveScoreService;
import com.etsaion.vo.ComprehensiveScoreVO;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ComprehensiveScoreServiceImpl extends ServiceImpl<ComprehensiveScoreMapper, ComprehensiveScore>
        implements ComprehensiveScoreService {

    @Override
    public ComprehensiveScoreVO getLatestByStudentNo(String studentNo) {
        return getByStudentNo(studentNo, null);
    }

    @Override
    public ComprehensiveScoreVO getByStudentNo(String studentNo, String academicYear) {
        if (StrUtil.isBlank(studentNo)) {
            return null;
        }
        LambdaQueryWrapper<ComprehensiveScore> wrapper = new LambdaQueryWrapper<ComprehensiveScore>()
                .eq(ComprehensiveScore::getStudentNo, studentNo)
                .eq(StrUtil.isNotBlank(academicYear), ComprehensiveScore::getAcademicYear, academicYear)
                .orderByDesc(ComprehensiveScore::getAcademicYear)
                .last("LIMIT 1");
        ComprehensiveScore score = this.getOne(wrapper, false);
        return toVO(score);
    }

    @Override
    public List<ComprehensiveScoreVO> listByScope(String academicYear, String college, String major) {
        LambdaQueryWrapper<ComprehensiveScore> wrapper = new LambdaQueryWrapper<ComprehensiveScore>()
                .eq(StrUtil.isNotBlank(academicYear), ComprehensiveScore::getAcademicYear, academicYear)
                .in(StrUtil.isNotBlank(college), ComprehensiveScore::getCollege, collegeAliases(college))
                .in(StrUtil.isNotBlank(major), ComprehensiveScore::getMajor, majorAliases(major))
                .orderByAsc(ComprehensiveScore::getGrade)
                .orderByAsc(ComprehensiveScore::getMajor)
                .orderByAsc(ComprehensiveScore::getComprehensiveRank);
        return this.list(wrapper).stream().map(this::toVO).collect(Collectors.toList());
    }

    private ComprehensiveScoreVO toVO(ComprehensiveScore score) {
        if (score == null) {
            return null;
        }
        ComprehensiveScoreVO vo = new ComprehensiveScoreVO();
        BeanUtils.copyProperties(score, vo);
        vo.setMajor(displayMajor(vo.getMajor()));
        vo.setRankTotal(resolveRankTotal(score));
        vo.setRankScope(resolveRankScope(score));
        return vo;
    }

    private Long resolveRankTotal(ComprehensiveScore score) {
        Long inferred = inferRankTotalFromOfficialPercent(score);
        if (inferred != null) {
            return inferred;
        }
        LambdaQueryWrapper<ComprehensiveScore> wrapper = new LambdaQueryWrapper<ComprehensiveScore>()
                .eq(StrUtil.isNotBlank(score.getAcademicYear()), ComprehensiveScore::getAcademicYear, score.getAcademicYear())
                .eq(StrUtil.isNotBlank(score.getGrade()), ComprehensiveScore::getGrade, score.getGrade());
        if (StrUtil.isNotBlank(score.getSourceFile())) {
            wrapper.eq(ComprehensiveScore::getSourceFile, score.getSourceFile());
        } else {
            wrapper.eq(StrUtil.isNotBlank(score.getMajor()), ComprehensiveScore::getMajor, score.getMajor());
        }
        return this.count(wrapper);
    }

    private Long inferRankTotalFromOfficialPercent(ComprehensiveScore score) {
        if (score.getComprehensiveRank() == null || score.getComprehensiveRankPercent() == null) {
            return null;
        }
        BigDecimal percent = score.getComprehensiveRankPercent();
        if (percent.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }
        long total = BigDecimal.valueOf(score.getComprehensiveRank())
                .divide(percent, 0, RoundingMode.HALF_UP)
                .longValue();
        return Math.max(total, score.getComprehensiveRank().longValue());
    }

    private String resolveRankScope(ComprehensiveScore score) {
        String grade = StrUtil.blankToDefault(score.getGrade(), "");
        String major = officialScopeMajor(score);
        return grade + major;
    }

    private String officialScopeMajor(ComprehensiveScore score) {
        if (StrUtil.contains(score.getSourceFile(), "软件工程")) {
            return "软件工程";
        }
        return displayMajor(StrUtil.blankToDefault(score.getMajor(), ""));
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

    private List<String> collegeAliases(String college) {
        if (StrUtil.isBlank(college)) {
            return List.of();
        }
        if ("计算机学院".equals(college)
                || "计算机与人工智能学院".equals(college)
                || "计算机与智能教育学院".equals(college)) {
            return List.of("计算机学院", "计算机与人工智能学院", "计算机与智能教育学院");
        }
        return List.of(college);
    }
}
