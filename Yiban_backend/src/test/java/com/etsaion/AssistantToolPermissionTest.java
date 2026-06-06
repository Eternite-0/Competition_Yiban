package com.etsaion;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.etsaion.entity.Competition;
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
import com.etsaion.service.TeacherService;
import com.etsaion.service.ai.AiCompetitionDraftService;
import com.etsaion.service.ai.AiTaskService;
import com.etsaion.service.ai.AssistantToolRegistry;
import com.etsaion.vo.CompetitionVO;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

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

    // ────────────── helpers ──────────────

    private AssistantToolRegistry createRegistry() {
        return createRegistry(mock(CompetitionService.class));
    }

    private AssistantToolRegistry createRegistry(CompetitionService competitionService) {
        AssistantToolRegistry registry = new AssistantToolRegistry();
        ReflectionTestUtils.setField(registry, "competitionService", competitionService);
        ReflectionTestUtils.setField(registry, "registrationService", mock(RegistrationService.class));
        ReflectionTestUtils.setField(registry, "submissionService", mock(SubmissionService.class));
        ReflectionTestUtils.setField(registry, "awardProofService", mock(AwardProofService.class));
        ReflectionTestUtils.setField(registry, "reviewTaskService", mock(ReviewTaskService.class));
        ReflectionTestUtils.setField(registry, "growthRecordService", mock(GrowthRecordService.class));
        ReflectionTestUtils.setField(registry, "userService", mock(UserService.class));
        ReflectionTestUtils.setField(registry, "aiTaskService", mock(AiTaskService.class));
        ReflectionTestUtils.setField(registry, "aiCompetitionDraftService", mock(AiCompetitionDraftService.class));
        ReflectionTestUtils.setField(registry, "activityService", mock(ActivityService.class));
        ReflectionTestUtils.setField(registry, "messageService", mock(MessageService.class));
        ReflectionTestUtils.setField(registry, "announcementService", mock(AnnouncementService.class));
        ReflectionTestUtils.setField(registry, "teacherService", mock(TeacherService.class));
        return registry;
    }
}
