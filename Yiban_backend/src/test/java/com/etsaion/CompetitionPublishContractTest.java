package com.etsaion;

import com.etsaion.dto.EventPublishDTO;
import com.etsaion.entity.Competition;
import com.etsaion.exception.BusinessException;
import com.etsaion.service.ActivityCategoryService;
import com.etsaion.service.CompetitionService;
import com.etsaion.service.ai.CompetitionNameMatcher;
import com.etsaion.service.impl.CompetitionPublishServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import javax.validation.Validation;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 赛事写入通道的契约。
 *
 * 关键点是：无论从发布接口还是 AI 草稿确认进来，
 * 写进 competition 表的数据都要遵守同一套规则。
 */
class CompetitionPublishContractTest {

    private CompetitionPublishServiceImpl service;
    private CompetitionService competitionService;

    @BeforeEach
    void setUp() {
        service = new CompetitionPublishServiceImpl();
        competitionService = mock(CompetitionService.class);
        ActivityCategoryService activityCategoryService = mock(ActivityCategoryService.class);
        when(activityCategoryService.resolveOrCreate(eq("competition"), any()))
                .thenAnswer(invocation -> invocation.getArgument(1));

        ReflectionTestUtils.setField(service, "competitionService", competitionService);
        ReflectionTestUtils.setField(service, "activityCategoryService", activityCategoryService);
        ReflectionTestUtils.setField(service, "validator",
                Validation.buildDefaultValidatorFactory().getValidator());
    }

    @Test
    void emptyTagListsBecomeEmptyJsonArraysNotNull() {
        service.create(validDto(), "published");

        Competition saved = savedCompetition();
        assertEquals("[]", saved.getTags());
        assertEquals("[]", saved.getTracks());
    }

    @Test
    void tagsAreStoredAsJson() {
        EventPublishDTO dto = validDto();
        dto.setTags(List.of("AI", "创新"));

        service.create(dto, "published");

        assertTrue(savedCompetition().getTags().contains("AI"));
    }

    @Test
    void callerSuppliedStatusWinsOverTheDefault() {
        EventPublishDTO dto = validDto();
        dto.setStatus("draft");

        service.create(dto, "published");

        assertEquals("draft", savedCompetition().getStatus());
    }

    @Test
    void defaultStatusAppliesWhenTheCallerLeavesItBlank() {
        service.create(validDto(), "draft");

        assertEquals("draft", savedCompetition().getStatus());
    }

    @Test
    void nullContentIsStoredAsEmptyStringSoRenderingNeverSeesNull() {
        EventPublishDTO dto = validDto();
        dto.setContent(null);

        service.create(dto, "published");

        assertEquals("", savedCompetition().getContent());
    }

    @Test
    void constraintsApplyToEveryCaller() {
        // 校验此前只挂在 controller 的 @Validated 上，AI 草稿确认能绕过去；
        // 现在在服务里执行，非 HTTP 的调用方同样受约束
        EventPublishDTO dto = validDto();
        dto.setName("  ");

        BusinessException ex = assertThrows(BusinessException.class, () -> service.create(dto, "published"));

        assertTrue(ex.getMessage().contains("名称"));
    }

    @Test
    void invalidTeamSizeIsRefused() {
        EventPublishDTO dto = validDto();
        dto.setMaxTeamSize(0);

        assertThrows(BusinessException.class, () -> service.create(dto, "published"));
    }

    // ==================== 赛事重名判定 ====================

    @Test
    void yearAndEditionPrefixesDoNotMakeTwoNamesDifferent() {
        // 同一个赛事在不同来源上写法不一，判重必须能认出来
        double score = CompetitionNameMatcher.similarity(
                CompetitionNameMatcher.normalize("2026年第九届“互联网+”大学生创新创业大赛"),
                CompetitionNameMatcher.normalize("“互联网+”大学生创新创业大赛"));

        assertTrue(score >= CompetitionNameMatcher.DUPLICATE_THRESHOLD,
                "带年份和届次的写法应判为同一赛事，实际相似度 " + score);
    }

    @Test
    void editionPrefixAloneIsStrippedEntirely() {
        assertEquals(CompetitionNameMatcher.normalize("第九届蓝桥杯"),
                CompetitionNameMatcher.normalize("蓝桥杯"));
    }

    @Test
    void genuinelyDifferentCompetitionsStayBelowTheDuplicateThreshold() {
        double score = CompetitionNameMatcher.similarity(
                CompetitionNameMatcher.normalize("全国大学生数学建模竞赛"),
                CompetitionNameMatcher.normalize("全国大学生电子设计竞赛"));

        assertTrue(score < CompetitionNameMatcher.DUPLICATE_THRESHOLD,
                "两个不同的赛事不应被判为重复，实际相似度 " + score);
    }

    private EventPublishDTO validDto() {
        EventPublishDTO dto = new EventPublishDTO();
        dto.setName("测试赛事");
        dto.setLevel("校级");
        dto.setCategory("A");
        dto.setStartTime(LocalDateTime.of(2026, 6, 1, 0, 0));
        dto.setEndTime(LocalDateTime.of(2026, 6, 10, 0, 0));
        dto.setMaxTeamSize(3);
        dto.setContent("内容");
        return dto;
    }

    private Competition savedCompetition() {
        ArgumentCaptor<Competition> captor = ArgumentCaptor.forClass(Competition.class);
        verify(competitionService).save(captor.capture());
        return captor.getValue();
    }
}
