package com.etsaion;

import com.etsaion.dto.ai.CompetitionDraftConfirmDTO;
import com.etsaion.entity.AiCompetitionDraft;
import com.etsaion.entity.Competition;
import com.etsaion.entity.CompetitionStage;
import com.etsaion.mapper.AiCompetitionDraftMapper;
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
        AiCompetitionDraftServiceImpl service = new AiCompetitionDraftServiceImpl();
        ReflectionTestUtils.setField(service, "baseMapper", mapper);
        ReflectionTestUtils.setField(service, "competitionService", competitionService);
        ReflectionTestUtils.setField(service, "competitionStageService", competitionStageService);

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
}
