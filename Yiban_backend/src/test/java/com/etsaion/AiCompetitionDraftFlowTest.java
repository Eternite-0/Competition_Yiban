package com.etsaion;

import com.etsaion.dto.ai.CompetitionDraftConfirmDTO;
import com.etsaion.entity.AiCompetitionDraft;
import com.etsaion.entity.Competition;
import com.etsaion.entity.CompetitionStage;
import com.etsaion.mapper.AiCompetitionDraftMapper;
import com.etsaion.service.ActivityCategoryService;
import com.etsaion.service.CompetitionService;
import com.etsaion.service.CompetitionStageService;
import com.etsaion.service.impl.AiCompetitionDraftServiceImpl;
import com.etsaion.vo.ai.AiCompetitionDraftVO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AiCompetitionDraftFlowTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void confirmDraftCreatesDraftCompetitionAndStages() {
        AiCompetitionDraftMapper mapper = mock(AiCompetitionDraftMapper.class);
        CompetitionService competitionService = mock(CompetitionService.class);
        CompetitionStageService competitionStageService = mock(CompetitionStageService.class);
        ActivityCategoryService activityCategoryService = mock(ActivityCategoryService.class);
        AiCompetitionDraftServiceImpl service = new AiCompetitionDraftServiceImpl();
        ReflectionTestUtils.setField(service, "baseMapper", mapper);
        ReflectionTestUtils.setField(service, "competitionService", competitionService);
        ReflectionTestUtils.setField(service, "competitionStageService", competitionStageService);
        ReflectionTestUtils.setField(service, "activityCategoryService", activityCategoryService);

        AiCompetitionDraft draft = new AiCompetitionDraft();
        draft.setId(7L);
        draft.setName("2026 AI 创新挑战赛");
        draft.setLevel("省级");
        draft.setCategory("A");
        draft.setOrganizer("创新创业学院");
        draft.setStartTime(LocalDateTime.of(2026, 6, 1, 0, 0));
        draft.setEndTime(LocalDateTime.of(2026, 6, 10, 23, 59));
        draft.setCompetitionStart(LocalDateTime.of(2026, 6, 20, 9, 0));
        draft.setCompetitionEnd(LocalDateTime.of(2026, 6, 21, 18, 0));
        draft.setMaxTeamSize(3);
        draft.setContent("围绕 AI 应用完成作品。");
        draft.setTags("AI,创新");
        draft.setTracks("[\"软件开发\",\"大模型应用\"]");
        draft.setStagesJson("[{\"name\":\"报名\",\"startTime\":\"2026-06-01 00:00:00\","
                + "\"endTime\":\"2026-06-10 23:59:59\",\"description\":\"提交报名表\"},"
                + "{\"name\":\"决赛\",\"description\":\"现场答辩\"}]");
        draft.setStatus("pending_review");

        when(mapper.selectById(7L)).thenReturn(draft);
        when(mapper.updateById(any(AiCompetitionDraft.class))).thenReturn(1);
        when(competitionService.save(any(Competition.class))).thenAnswer(invocation -> {
            Competition competition = invocation.getArgument(0);
            competition.setId(99L);
            return true;
        });
        when(activityCategoryService.resolveOrCreate(eq("competition"), any())).thenAnswer(invocation -> invocation.getArgument(1));
        when(competitionStageService.createStage(eq(99L), any(CompetitionStage.class)))
                .thenAnswer(invocation -> invocation.getArgument(1));

        CompetitionDraftConfirmDTO dto = new CompetitionDraftConfirmDTO();
        dto.setReviewNote("字段已人工核验");

        AiCompetitionDraftVO result = service.confirmDraft(7L, 1L, dto);

        assertEquals("confirmed", result.getStatus());
        assertEquals(99L, result.getCompetitionId());
        assertEquals(1L, result.getReviewerId());
        assertEquals("字段已人工核验", result.getReviewNote());

        ArgumentCaptor<Competition> competitionCaptor = ArgumentCaptor.forClass(Competition.class);
        verify(competitionService).save(competitionCaptor.capture());
        Competition competition = competitionCaptor.getValue();
        assertEquals("2026 AI 创新挑战赛", competition.getName());
        assertEquals("省级", competition.getLevel());
        assertEquals("A", competition.getCategory());
        assertEquals("创新创业学院", competition.getOrganizer());
        assertEquals(3, competition.getMaxTeamSize());
        assertEquals("围绕 AI 应用完成作品。", competition.getContent());
        assertEquals("[\"AI\",\"创新\"]", competition.getTags());
        assertEquals("[\"软件开发\",\"大模型应用\"]", competition.getTracks());
        assertEquals("draft", competition.getStatus());

        ArgumentCaptor<CompetitionStage> stageCaptor = ArgumentCaptor.forClass(CompetitionStage.class);
        verify(competitionStageService, org.mockito.Mockito.times(2)).createStage(eq(99L), stageCaptor.capture());
        List<CompetitionStage> stages = stageCaptor.getAllValues();
        assertEquals("报名", stages.get(0).getName());
        assertEquals(1, stages.get(0).getStageOrder());
        assertEquals("upcoming", stages.get(0).getStatus());
        assertEquals(LocalDateTime.of(2026, 6, 1, 0, 0), stages.get(0).getStartTime());
        assertEquals("提交报名表", stages.get(0).getDescription());
        assertEquals("决赛", stages.get(1).getName());
        assertEquals(2, stages.get(1).getStageOrder());
        assertTrue(stages.stream().allMatch(stage -> "upcoming".equals(stage.getStatus())));

        assertEquals("confirmed", draft.getStatus());
        assertEquals(99L, draft.getCompetitionId());
        verify(mapper).updateById(draft);
    }

    @Test
    void createDraftAcceptsSnakeCaseFieldsAndTextStagesFromModel() throws Exception {
        CompetitionService competitionService = mock(CompetitionService.class);
        AiCompetitionDraftServiceImpl service = new AiCompetitionDraftServiceImpl();
        ReflectionTestUtils.setField(service, "competitionService", competitionService);

        JsonNode node = objectMapper.readTree("{"
                + "\"source_title\":\"AI 通知\","
                + "\"name\":\"2026 年全国大学生人工智能创新应用挑战赛\","
                + "\"level\":\"国家级\","
                + "\"category\":\"A\","
                + "\"organizer\":\"学生工作中心\","
                + "\"registration_start\":\"2026-06-01 00:00:00\","
                + "\"registration_end\":\"2026-06-20 23:59:59\","
                + "\"competition_start\":\"2026-07-01 09:00:00\","
                + "\"competition_end\":\"2026-07-05 18:00:00\","
                + "\"max_team_size\":4,"
                + "\"team_requirements\":\"每队 1-4 人，可跨专业组队。\","
                + "\"tags\":[\"AI\",\"创新应用\"],"
                + "\"tracks\":[\"智能体应用\"],"
                + "\"stages\":["
                + "\"报名阶段：2026-06-01 00:00:00 至 2026-06-20 23:59:59\","
                + "\"决赛答辩：2026-07-05 09:00:00 至 2026-07-05 18:00:00\""
                + "]"
                + "}");

        AiCompetitionDraft draft = ReflectionTestUtils.invokeMethod(service, "createDraftFromJson",
                3L, "file", "notice.txt", "notice.txt", node);

        assertNotNull(draft);
        assertEquals("AI 通知", draft.getSourceTitle());
        assertEquals("2026 年全国大学生人工智能创新应用挑战赛", draft.getName());
        assertEquals(LocalDateTime.of(2026, 6, 1, 0, 0), draft.getStartTime());
        assertEquals(LocalDateTime.of(2026, 6, 20, 23, 59, 59), draft.getEndTime());
        assertEquals(LocalDateTime.of(2026, 7, 1, 9, 0), draft.getCompetitionStart());
        assertEquals(LocalDateTime.of(2026, 7, 5, 18, 0), draft.getCompetitionEnd());
        assertEquals(4, draft.getMaxTeamSize());
        assertEquals("每队 1-4 人，可跨专业组队。", draft.getContent());

        JsonNode stages = objectMapper.readTree(draft.getStagesJson());
        assertEquals("报名阶段", stages.get(0).get("name").asText());
        assertEquals("2026-06-01 00:00:00", stages.get(0).get("startTime").asText());
        assertEquals("2026-06-20 23:59:59", stages.get(0).get("endTime").asText());
        assertEquals("决赛答辩", stages.get(1).get("name").asText());
        assertEquals("2026-07-05 09:00:00", stages.get(1).get("startTime").asText());
        assertEquals("2026-07-05 18:00:00", stages.get(1).get("endTime").asText());
    }

    @Test
    void createDraftAcceptsChineseFieldsFromModel() throws Exception {
        CompetitionService competitionService = mock(CompetitionService.class);
        AiCompetitionDraftServiceImpl service = new AiCompetitionDraftServiceImpl();
        ReflectionTestUtils.setField(service, "competitionService", competitionService);

        JsonNode node = objectMapper.readTree("{"
                + "\"赛事名称\":\"2026 年全国大学生人工智能创新应用挑战赛\","
                + "\"赛事级别\":\"国家级\","
                + "\"赛事分类\":\"A\","
                + "\"主办方\":\"全国高校人工智能创新联盟\","
                + "\"报名开始时间\":\"2026-06-15 09:00:00\","
                + "\"报名截止时间\":\"2026-07-20 18:00:00\","
                + "\"比赛开始时间\":\"2026-07-25 09:00:00\","
                + "\"比赛结束时间\":\"2026-09-20 18:00:00\","
                + "\"组队要求\":\"每支队伍由 1 至 4 名在校学生组成。\","
                + "\"最大团队人数\":4,"
                + "\"赛道\":[\"人工智能 + 教育创新\",\"人工智能 + 社会治理\"],"
                + "\"赛事标签\":[\"人工智能\",\"创新应用\"],"
                + "\"来源标题\":\"2026 年全国大学生人工智能创新应用挑战赛赛事通知\","
                + "\"来源 URL\":\"https://example.edu.cn/notices/2026-ai-innovation-competition\","
                + "\"比赛阶段\":["
                + "{\"阶段名称\":\"报名与作品提交\",\"开始时间\":\"2026-06-15 09:00:00\",\"结束时间\":\"2026-07-20 18:00:00\"},"
                + "{\"阶段名称\":\"全国总决赛\",\"开始时间\":\"2026-09-18 09:00:00\",\"结束时间\":\"2026-09-20 18:00:00\"}"
                + "]"
                + "}");

        AiCompetitionDraft draft = ReflectionTestUtils.invokeMethod(service, "createDraftFromJson",
                4L, "file", "notice.txt", "notice.txt", node);

        assertNotNull(draft);
        assertEquals("2026 年全国大学生人工智能创新应用挑战赛赛事通知", draft.getSourceTitle());
        assertEquals("2026 年全国大学生人工智能创新应用挑战赛", draft.getName());
        assertEquals("国家级", draft.getLevel());
        assertEquals("A", draft.getCategory());
        assertEquals("全国高校人工智能创新联盟", draft.getOrganizer());
        assertEquals(LocalDateTime.of(2026, 6, 15, 9, 0), draft.getStartTime());
        assertEquals(LocalDateTime.of(2026, 7, 20, 18, 0), draft.getEndTime());
        assertEquals(LocalDateTime.of(2026, 7, 25, 9, 0), draft.getCompetitionStart());
        assertEquals(LocalDateTime.of(2026, 9, 20, 18, 0), draft.getCompetitionEnd());
        assertEquals(4, draft.getMaxTeamSize());
        assertEquals("每支队伍由 1 至 4 名在校学生组成。", draft.getContent());
        assertEquals("[\"人工智能\",\"创新应用\"]", draft.getTags());
        assertEquals("[\"人工智能 + 教育创新\",\"人工智能 + 社会治理\"]", draft.getTracks());

        JsonNode stages = objectMapper.readTree(draft.getStagesJson());
        assertEquals("报名与作品提交", stages.get(0).get("name").asText());
        assertEquals("2026-06-15 09:00:00", stages.get(0).get("startTime").asText());
        assertEquals("2026-07-20 18:00:00", stages.get(0).get("endTime").asText());
        assertEquals("全国总决赛", stages.get(1).get("name").asText());
    }

    @Test
    void createDraftAcceptsCompetitionNamedFieldsFromModel() throws Exception {
        CompetitionService competitionService = mock(CompetitionService.class);
        AiCompetitionDraftServiceImpl service = new AiCompetitionDraftServiceImpl();
        ReflectionTestUtils.setField(service, "competitionService", competitionService);

        JsonNode node = objectMapper.readTree("{"
                + "\"competitionName\":\"2026 年全国大学生人工智能创新应用挑战赛\","
                + "\"competitionLevel\":\"国家级\","
                + "\"competitionCategory\":\"A\","
                + "\"organizer\":\"全国高校人工智能创新联盟\","
                + "\"registrationStartTime\":\"2026-06-15 09:00:00\","
                + "\"registrationEndTime\":\"2026-07-20 18:00:00\","
                + "\"competitionStartTime\":\"2026-07-25 09:00:00\","
                + "\"competitionEndTime\":\"2026-09-20 18:00:00\","
                + "\"teamRequirements\":\"每支队伍由 1 至 4 名在校学生组成。\","
                + "\"maxTeamSize\":4,"
                + "\"tracks\":[\"人工智能 + 教育创新\"],"
                + "\"competitionPhases\":["
                + "{\"name\":\"报名与作品提交\",\"time_range\":\"2026-06-15 09:00:00 至 2026-07-20 18:00:00\"},"
                + "{\"name\":\"全国总决赛\",\"time_range\":\"2026-09-18 09:00:00 至 2026-09-20 18:00:00\"}"
                + "],"
                + "\"tags\":[\"人工智能\",\"创新应用\"],"
                + "\"sourceURL\":\"https://example.edu.cn/notices/2026-ai-innovation-competition\""
                + "}");

        AiCompetitionDraft draft = ReflectionTestUtils.invokeMethod(service, "createDraftFromJson",
                5L, "file", "notice.txt", "notice.txt", node);

        assertNotNull(draft);
        assertEquals("2026 年全国大学生人工智能创新应用挑战赛", draft.getName());
        assertEquals("国家级", draft.getLevel());
        assertEquals("A", draft.getCategory());
        assertEquals(LocalDateTime.of(2026, 6, 15, 9, 0), draft.getStartTime());
        assertEquals(LocalDateTime.of(2026, 7, 20, 18, 0), draft.getEndTime());
        assertEquals(LocalDateTime.of(2026, 7, 25, 9, 0), draft.getCompetitionStart());
        assertEquals(LocalDateTime.of(2026, 9, 20, 18, 0), draft.getCompetitionEnd());

        JsonNode stages = objectMapper.readTree(draft.getStagesJson());
        assertEquals("报名与作品提交", stages.get(0).get("name").asText());
        assertEquals("2026-06-15 09:00:00", stages.get(0).get("startTime").asText());
        assertEquals("2026-07-20 18:00:00", stages.get(0).get("endTime").asText());
        assertEquals("全国总决赛", stages.get(1).get("name").asText());
    }

    @Test
    void autoFillCorrectionsCompleteLanqiaoRegistrationAndApproximateCompetitionTimes() throws Exception {
        AiCompetitionDraftServiceImpl service = new AiCompetitionDraftServiceImpl();
        ReflectionTestUtils.setField(service, "competitionService", mock(CompetitionService.class));

        JsonNode node = objectMapper.readTree("{"
                + "\"name\":\"第十七届蓝桥杯全国软件和信息技术专业人才大赛\","
                + "\"level\":\"全国赛\","
                + "\"category\":\"科技\","
                + "\"organizer\":\"蓝桥杯大赛组委会\","
                + "\"competitionStart\":\"2026-04-01 00:00:00\","
                + "\"competitionEnd\":\"2026-06-30 23:59:59\","
                + "\"content\":\"面向全日制在校大学生。\","
                + "\"tags\":[\"科技\"],"
                + "\"tracks\":[]"
                + "}");
        AiCompetitionDraft draft = ReflectionTestUtils.invokeMethod(service, "createDraftFromJson",
                11L, "url", "https://jiaowu.nwpu.edu.cn/info/1164/25808.htm",
                "第十七届蓝桥杯全国软件和信息技术专业人才大赛通知", node);

        ReflectionTestUtils.invokeMethod(service, "applyAutoFillCorrections", draft, lanqiaoNoticeText());

        assertNotNull(draft);
        assertEquals("国家级", draft.getLevel());
        assertEquals("A", draft.getCategory());
        assertEquals(LocalDateTime.of(2025, 10, 20, 10, 0), draft.getStartTime());
        assertEquals(LocalDateTime.of(2026, 4, 27, 14, 0), draft.getEndTime());
        assertEquals(LocalDateTime.of(2026, 4, 1, 0, 0), draft.getCompetitionStart());
        assertEquals(LocalDateTime.of(2026, 6, 20, 23, 59, 59), draft.getCompetitionEnd());
        assertTrue(draft.getTags().contains("AI"));
        assertTrue(draft.getTags().contains("软件"));
        assertTrue(draft.getTags().contains("信息技术"));
        assertTrue(draft.getTracks().contains("软件赛"));
        assertTrue(draft.getTracks().contains("中数杯 AIGC 数字内容创意设计大赛"));

        JsonNode stages = objectMapper.readTree(draft.getStagesJson());
        assertTrue(stages.size() >= 6);
        assertTrue(draft.getStagesJson().contains("软件赛、电子赛、人工智能赛报名"));
        assertTrue(draft.getStagesJson().contains("全国选拔赛"));
        assertTrue(draft.getStagesJson().contains("全国总决赛"));
        assertTrue(draft.getRiskFlagsJson().contains("multiple_registration_windows"));
        assertTrue(draft.getRiskFlagsJson().contains("approximate_competition_time"));
        assertTrue(draft.getRiskFlagsJson().contains("multi_stage_competition_time"));
        assertTrue(draft.getEvidenceJson().contains("registrationWindows"));
    }

    @Test
    void autoFillCorrectionsKeepExactCompetitionDates() throws Exception {
        AiCompetitionDraftServiceImpl service = new AiCompetitionDraftServiceImpl();
        ReflectionTestUtils.setField(service, "competitionService", mock(CompetitionService.class));

        JsonNode node = objectMapper.readTree("{"
                + "\"name\":\"精确日期测试赛\","
                + "\"category\":\"算法编程\","
                + "\"competitionStart\":\"2026-07-05 09:00:00\","
                + "\"competitionEnd\":\"2026-07-05 18:00:00\""
                + "}");
        AiCompetitionDraft draft = ReflectionTestUtils.invokeMethod(service, "createDraftFromJson",
                12L, "file", "notice.txt", "notice.txt", node);

        ReflectionTestUtils.invokeMethod(service, "applyAutoFillCorrections", draft,
                "比赛时间：2026年7月5日 09:00—2026年7月5日 18:00。报名时间：2026年6月1日10:00—2026年6月20日18:00。");

        assertNotNull(draft);
        assertEquals("algorithm", draft.getCategory());
        assertEquals(LocalDateTime.of(2026, 7, 5, 9, 0), draft.getCompetitionStart());
        assertEquals(LocalDateTime.of(2026, 7, 5, 18, 0), draft.getCompetitionEnd());
        assertEquals(LocalDateTime.of(2026, 6, 1, 10, 0), draft.getStartTime());
        assertEquals(LocalDateTime.of(2026, 6, 20, 18, 0), draft.getEndTime());
    }

    @Test
    void autoFillCorrectionsHandleDateOnlyRegistrationRange() throws Exception {
        AiCompetitionDraftServiceImpl service = new AiCompetitionDraftServiceImpl();
        ReflectionTestUtils.setField(service, "competitionService", mock(CompetitionService.class));

        JsonNode node = objectMapper.readTree("{\"name\":\"日期区间测试赛\",\"category\":\"科技\"}");
        AiCompetitionDraft draft = ReflectionTestUtils.invokeMethod(service, "createDraftFromJson",
                13L, "file", "notice.txt", "notice.txt", node);

        ReflectionTestUtils.invokeMethod(service, "applyAutoFillCorrections", draft,
                "报名时间：2026年5月1日—2026年5月31日。比赛时间：2026年7月上旬。");

        assertNotNull(draft);
        assertEquals(LocalDateTime.of(2026, 5, 1, 0, 0), draft.getStartTime());
        assertEquals(LocalDateTime.of(2026, 5, 31, 23, 59, 59), draft.getEndTime());
    }

    @Test
    void createDraftFromJsonMergesStructuredRegistrationAndApproximateRanges() throws Exception {
        AiCompetitionDraftServiceImpl service = new AiCompetitionDraftServiceImpl();
        ReflectionTestUtils.setField(service, "competitionService", mock(CompetitionService.class));

        JsonNode node = objectMapper.readTree("{"
                + "\"name\":\"结构化窗口测试赛\","
                + "\"category\":\"科技\","
                + "\"registrationWindows\":["
                + "{\"name\":\"软件赛报名\",\"startTime\":\"2025-10-20 10:00:00\",\"endTime\":\"2025-12-15 14:00:00\"},"
                + "{\"name\":\"视觉艺术设计赛报名及提交作品\",\"startTime\":\"2025-10-20 10:00:00\",\"endTime\":\"2026-04-27 14:00:00\"}],"
                + "\"approximateTimeRanges\":["
                + "{\"name\":\"全国选拔赛\",\"text\":\"2026年4月\"},"
                + "{\"name\":\"全国总决赛\",\"text\":\"2026年6月中上旬\"}]"
                + "}");
        AiCompetitionDraft draft = ReflectionTestUtils.invokeMethod(service, "createDraftFromJson",
                14L, "file", "notice.txt", "notice.txt", node);

        assertNotNull(draft);
        assertEquals(LocalDateTime.of(2025, 10, 20, 10, 0), draft.getStartTime());
        assertEquals(LocalDateTime.of(2026, 4, 27, 14, 0), draft.getEndTime());
        assertEquals(LocalDateTime.of(2026, 4, 1, 0, 0), draft.getCompetitionStart());
        assertEquals(LocalDateTime.of(2026, 6, 20, 23, 59, 59), draft.getCompetitionEnd());
        assertTrue(draft.getStagesJson().contains("软件赛报名"));
        assertTrue(draft.getStagesJson().contains("全国总决赛"));
        assertTrue(draft.getRiskFlagsJson().contains("multiple_registration_windows"));
        assertTrue(draft.getRiskFlagsJson().contains("approximate_competition_time"));
        assertTrue(draft.getRiskFlagsJson().contains("multi_stage_competition_time"));
    }

    private String lanqiaoNoticeText() {
        return "第十七届蓝桥杯全国软件和信息技术专业人才大赛通知。"
                + "所有全日制在校大学生。"
                + "项目类别分为软件赛、电子赛、人工智能赛、视觉艺术设计赛、数字科技创新赛、中数杯 AIGC 数字内容创意设计大赛。"
                + "二、竞赛时间 1.选拔赛时间：2026年4月。2.决赛时间：2026年6月中上旬。"
                + "三、报名相关事宜 1.全国选拔赛报名时间 "
                + "（1）软件赛、电子赛、人工智能赛报名时间：2025 年 10月20 日10:00—2025 年12月15日14:00。"
                + "（2）视觉艺术设计赛、数字科技创新赛报名及提交作品时间：2025年10月20 日10:00—2026年4月27日14:00。"
                + "（3）中数杯 AIGC 数字内容创意设计大赛报名时间：2025年10月20日10:00—2025年11月30日14:00，提交作品截止时间：2025年12月5日14:00。"
                + "2.报名方式 参赛学生统一登录大赛官网报名；大赛官方网站为：dasai.lanqiao.cn。"
                + "注意事项：请及时关注大赛官网。";
    }
}
