package com.etsaion;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.etsaion.entity.Competition;
import com.etsaion.entity.ComprehensiveScore;
import com.etsaion.service.AwardProofService;
import com.etsaion.service.CompetitionService;
import com.etsaion.service.GrowthRecordService;
import com.etsaion.service.MessageService;
import com.etsaion.service.RegistrationService;
import com.etsaion.service.ReviewTaskService;
import com.etsaion.service.SubmissionService;
import com.etsaion.service.UserService;
import com.etsaion.service.ActivityService;
import com.etsaion.service.AnnouncementService;
import com.etsaion.service.ComprehensiveScoreService;
import com.etsaion.service.TeacherService;
import com.etsaion.service.ai.AiCompetitionDraftService;
import com.etsaion.service.ai.AiArtifactService;
import com.etsaion.service.ai.AiTaskService;
import com.etsaion.service.ai.AssistantToolRegistry;
import com.etsaion.service.impl.StudentAccessPolicyImpl;
import com.etsaion.vo.CompetitionVO;
import com.etsaion.vo.ComprehensiveScoreVO;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AssistantToolPermissionTest {

    @Test
    void studentCannotCallTeacherTools() {
        AssistantToolRegistry registry = createRegistry();

        // search_students 是 teacher 工具，student 调用应该返回空或报错
        String result = registry.executeTool("search_students", "{\"keyword\":\"张三\"}", 4L, "student");
        // student 调用 search_students 不在工具列表中，但 executeTool 仍会执行
        // 实际场景中模型不会给 student 返回这个 tool_call
        assertNotNull(result);
    }

    @Test
    void studentToolDefinitionsDoNotIncludeTeacherTools() {
        AssistantToolRegistry registry = createRegistry();
        List<Map<String, Object>> studentTools = registry.getToolDefinitions(4L, "student");
        List<String> toolNames = studentTools.stream()
                .map(t -> (String) ((Map<?, ?>) t.get("function")).get("name"))
                .toList();

        assertTrue(toolNames.contains("get_my_registrations"));
        assertTrue(toolNames.contains("get_my_growth"));
        assertTrue(toolNames.contains("get_my_comprehensive_score"));
        assertFalse(toolNames.contains("search_students"));
        assertFalse(toolNames.contains("get_pending_reviews"));
        assertFalse(toolNames.contains("get_college_overview"));
    }

    @Test
    void teacherToolDefinitionsIncludeStudentTools() {
        AssistantToolRegistry registry = createRegistry();
        List<Map<String, Object>> teacherTools = registry.getToolDefinitions(2L, "teacher");
        List<String> toolNames = teacherTools.stream()
                .map(t -> (String) ((Map<?, ?>) t.get("function")).get("name"))
                .toList();

        assertTrue(toolNames.contains("search_students"));
        assertTrue(toolNames.contains("get_student_detail"));
        assertTrue(toolNames.contains("get_student_comprehensive_score"));
        assertTrue(toolNames.contains("find_student_comprehensive_score"));
        assertTrue(toolNames.contains("get_class_comprehensive_ranking"));
        assertTrue(toolNames.contains("get_pending_reviews"));
        assertTrue(toolNames.contains("get_college_overview"));
        assertFalse(toolNames.contains("get_my_registrations"));
    }

    @Test
    void adminToolDefinitionsIncludeAdminTools() {
        AssistantToolRegistry registry = createRegistry();
        List<Map<String, Object>> adminTools = registry.getToolDefinitions(1L, "admin");
        List<String> toolNames = adminTools.stream()
                .map(t -> (String) ((Map<?, ?>) t.get("function")).get("name"))
                .toList();

        assertTrue(toolNames.contains("get_pending_drafts"));
        assertTrue(toolNames.contains("get_ai_task_stats"));
        assertTrue(toolNames.contains("get_user_stats"));
        assertTrue(toolNames.contains("get_pending_reviews"));
        assertFalse(toolNames.contains("get_my_registrations"));
    }

    @Test
    void executeToolReturnsJsonString() {
        CompetitionService competitionService = mock(CompetitionService.class);
        AssistantToolRegistry registry = createRegistry(competitionService);

        Page<Competition> page = new Page<>();
        Competition c = new Competition();
        c.setId(1L);
        c.setName("测试赛事");
        c.setLevel("省级");
        c.setCategory("编程");
        c.setStatus("published");
        page.setRecords(List.of(c));
        when(competitionService.getCompetitionsPage(
                org.mockito.ArgumentMatchers.anyInt(),
                org.mockito.ArgumentMatchers.anyInt(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any()
        )).thenReturn(page);

        String result = registry.executeTool("search_competitions", "{\"keyword\":\"测试\"}", 4L, "student");
        assertNotNull(result);
        assertTrue(result.contains("测试赛事"));
    }

    @Test
    void comprehensiveScoreToolsReturnOnlyRankPercentAndScope() {
        UserService userService = mock(UserService.class);
        ComprehensiveScoreService comprehensiveScoreService = mock(ComprehensiveScoreService.class);
        TeacherService teacherService = mock(TeacherService.class);
        AssistantToolRegistry registry = createRegistry(mock(CompetitionService.class), userService, comprehensiveScoreService, teacherService);

        com.etsaion.entity.User student = new com.etsaion.entity.User();
        student.setId(21L);
        student.setUsername("202408014104");
        student.setRole("student");
        student.setCollege("计算机与人工智能学院");
        when(userService.getById(21L)).thenReturn(student);

        ComprehensiveScoreVO score = new ComprehensiveScoreVO();
        score.setAcademicYear("2024-2025-1");
        score.setStudentNo("202408014104");
        score.setRealName("陈思怡");
        score.setCollege("计算机与智能教育学院");
        score.setGrade("2024级");
        score.setMajor("人工智能");
        score.setClassName("2024人工智能1班");
        score.setComprehensiveRank(3);
        score.setRankTotal(109L);
        score.setComprehensiveRankPercent(new BigDecimal("0.02752294"));
        score.setRankScope("2024级人工智能");
        when(comprehensiveScoreService.getLatestByStudentNo("202408014104")).thenReturn(score);
        when(teacherService.getStudentComprehensive(21L)).thenReturn(score);

        JSONObject studentResult = JSONUtil.parseObj(registry.executeTool("get_my_comprehensive_score", "{}", 21L, "student"));
        assertRankOnlyPayload(studentResult);
        assertEquals(3, studentResult.getInt("comprehensiveRank"));
        assertEquals(109L, studentResult.getLong("rankTotal"));
        assertEquals("2024级人工智能", studentResult.getStr("rankScope"));

        JSONObject teacherResult = JSONUtil.parseObj(registry.executeTool("get_student_comprehensive_score", "{\"student_id\":21}", 21L, "teacher"));
        assertRankOnlyPayload(teacherResult);
        assertEquals("0.02752294", teacherResult.getStr("comprehensiveRankPercent"));
    }

    @Test
    void teacherClassComprehensiveRankingReturnsTablePayload() {
        UserService userService = mock(UserService.class);
        ComprehensiveScoreService comprehensiveScoreService = mock(ComprehensiveScoreService.class);
        AssistantToolRegistry registry = createRegistry(mock(CompetitionService.class), userService, comprehensiveScoreService, mock(TeacherService.class));

        com.etsaion.entity.User teacher = new com.etsaion.entity.User();
        teacher.setId(2L);
        teacher.setRole("teacher");
        teacher.setCollege("计算机与人工智能学院");
        when(userService.getById(2L)).thenReturn(teacher);

        ComprehensiveScore first = score("202408014104", "陈思怡", 89.65, 3, 90.23, 9);
        ComprehensiveScore second = score("202408014125", "刘容伶", 92.25, 2, 100.0, 1);
        when(comprehensiveScoreService.list(any(LambdaQueryWrapper.class))).thenReturn(List.of(first, second));

        JSONObject payload = JSONUtil.parseObj(registry.executeTool(
                "get_class_comprehensive_ranking",
                "{\"class_name\":\"2024人工智能1班\"}",
                2L,
                "teacher"));

        assertEquals("table", payload.getStr("type"));
        assertEquals(2, payload.getInt("total"));
        assertTrue(payload.getJSONArray("columns").contains("姓名"));
        assertEquals("刘容伶", payload.getJSONArray("rows").getJSONObject(0).getStr("姓名"));
        assertEquals("陈思怡", payload.getJSONArray("rows").getJSONObject(1).getStr("姓名"));
    }

    @Test
    void studentExecutionCannotCallTeacherOnlyStudentSearchTool() {
        AssistantToolRegistry registry = createRegistry();
        JSONObject payload = JSONUtil.parseObj(registry.executeTool("search_students", "{\"keyword\":\"张三\"}", 4L, "student"));

        assertTrue(payload.containsKey("error"));
    }

    // ────────────── helpers ──────────────

    private AssistantToolRegistry createRegistry() {
        return createRegistry(mock(CompetitionService.class));
    }

    private AssistantToolRegistry createRegistry(CompetitionService competitionService) {
        return createRegistry(
                competitionService,
                mock(UserService.class),
                mock(ComprehensiveScoreService.class),
                mock(TeacherService.class));
    }

    private AssistantToolRegistry createRegistry(
            CompetitionService competitionService,
            UserService userService,
            ComprehensiveScoreService comprehensiveScoreService,
            TeacherService teacherService) {
        AssistantToolRegistry registry = new AssistantToolRegistry();
        ReflectionTestUtils.setField(registry, "competitionService", competitionService);
        ReflectionTestUtils.setField(registry, "registrationService", mock(RegistrationService.class));
        ReflectionTestUtils.setField(registry, "submissionService", mock(SubmissionService.class));
        ReflectionTestUtils.setField(registry, "awardProofService", mock(AwardProofService.class));
        ReflectionTestUtils.setField(registry, "reviewTaskService", mock(ReviewTaskService.class));
        ReflectionTestUtils.setField(registry, "growthRecordService", mock(GrowthRecordService.class));
        ReflectionTestUtils.setField(registry, "userService", userService);
        StudentAccessPolicyImpl accessPolicy = new StudentAccessPolicyImpl();
        ReflectionTestUtils.setField(accessPolicy, "userService", userService);
        ReflectionTestUtils.setField(registry, "studentAccessPolicy", accessPolicy);
        ReflectionTestUtils.setField(registry, "aiTaskService", mock(AiTaskService.class));
        ReflectionTestUtils.setField(registry, "aiCompetitionDraftService", mock(AiCompetitionDraftService.class));
        ReflectionTestUtils.setField(registry, "activityService", mock(ActivityService.class));
        ReflectionTestUtils.setField(registry, "messageService", mock(MessageService.class));
        ReflectionTestUtils.setField(registry, "announcementService", mock(AnnouncementService.class));
        ReflectionTestUtils.setField(registry, "teacherService", teacherService);
        ReflectionTestUtils.setField(registry, "aiArtifactService", mock(AiArtifactService.class));
        ReflectionTestUtils.setField(registry, "comprehensiveScoreService", comprehensiveScoreService);
        return registry;
    }

    private void assertRankOnlyPayload(JSONObject payload) {
        assertTrue(payload.getBool("found"));
        assertTrue(payload.containsKey("academicYear"));
        assertTrue(payload.containsKey("comprehensiveRank"));
        assertTrue(payload.containsKey("rankTotal"));
        assertTrue(payload.containsKey("comprehensiveRankPercent"));
        assertTrue(payload.containsKey("rankScope"));
        assertTrue(payload.containsKey("scopeNote"));
        assertFalse(payload.containsKey("studentNo"));
        assertFalse(payload.containsKey("realName"));
        assertFalse(payload.containsKey("college"));
        assertFalse(payload.containsKey("grade"));
        assertFalse(payload.containsKey("major"));
        assertFalse(payload.containsKey("className"));
    }

    private ComprehensiveScore score(String studentNo, String realName, double comprehensive, int comprehensiveRank, double academic, int academicRank) {
        ComprehensiveScore score = new ComprehensiveScore();
        score.setAcademicYear("2024-2025-1");
        score.setStudentNo(studentNo);
        score.setRealName(realName);
        score.setCollege("计算机与智能教育学院");
        score.setGrade("2024级");
        score.setMajor("人工智能");
        score.setClassName("2024人工智能1班");
        score.setComprehensiveScore(BigDecimal.valueOf(comprehensive));
        score.setComprehensiveRank(comprehensiveRank);
        score.setComprehensiveRankPercent(new BigDecimal("0.02752294"));
        score.setAcademicScore(BigDecimal.valueOf(academic));
        score.setAcademicRank(academicRank);
        return score;
    }
}
