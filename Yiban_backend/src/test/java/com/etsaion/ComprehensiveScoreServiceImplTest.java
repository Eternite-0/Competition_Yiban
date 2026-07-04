package com.etsaion;

import com.etsaion.entity.ComprehensiveScore;
import com.etsaion.service.impl.ComprehensiveScoreServiceImpl;
import com.etsaion.vo.ComprehensiveScoreVO;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ComprehensiveScoreServiceImplTest {

    @Test
    void rankTotalUsesOfficialPercentInsteadOfSystemMajorCount() {
        ComprehensiveScore score = new ComprehensiveScore();
        score.setAcademicYear("2024-2025-1");
        score.setStudentNo("202408784237");
        score.setRealName("文晓翰");
        score.setGrade("2024级");
        score.setMajor("软件工程(创新班)");
        score.setComprehensiveRank(9);
        score.setComprehensiveRankPercent(new BigDecimal("0.024725274725274724"));
        score.setSourceFile("24级软件工程.xlsx");

        ComprehensiveScoreVO vo = ReflectionTestUtils.invokeMethod(
                new ComprehensiveScoreServiceImpl(),
                "toVO",
                score
        );

        assertEquals(364L, vo.getRankTotal());
        assertEquals("2024级软件工程", vo.getRankScope());
    }
}
