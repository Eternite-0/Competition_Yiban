package com.etsaion;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.etsaion.config.FlexibleLocalDateTimeDeserializer;
import com.etsaion.config.FlexibleStringListDeserializer;
import com.etsaion.entity.Competition;
import com.etsaion.entity.Registration;
import com.etsaion.entity.Submission;
import com.etsaion.exception.BusinessException;
import com.etsaion.mapper.RegistrationMapper;
import com.etsaion.service.CompetitionService;
import com.etsaion.service.GrowthRecordService;
import com.etsaion.service.MessageService;
import com.etsaion.service.RegistrationService;
import com.etsaion.service.ReviewTaskService;
import com.etsaion.service.SubmissionService;
import com.etsaion.service.SubmissionStudentService;
import com.etsaion.service.impl.GrowthRecordServiceImpl;
import com.etsaion.service.impl.RegistrationServiceImpl;
import com.etsaion.service.impl.SubmissionServiceImpl;
import com.etsaion.vo.StudentGrowthVO;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AdditionalUnitTest {

    // =========================================================================
    // 1. FlexibleLocalDateTimeDeserializer - 日期解析
    // =========================================================================

    @Test
    void deserializerParsesDateOnlyAsMidnight() throws Exception {
        FlexibleLocalDateTimeDeserializer deserializer = new FlexibleLocalDateTimeDeserializer();
        JsonParser parser = createParser("\"2026-06-01\"");
        LocalDateTime result = deserializer.deserialize(parser, null);

        assertEquals(LocalDate.of(2026, 6, 1).atStartOfDay(), result);
        assertEquals(LocalTime.MIDNIGHT, result.toLocalTime());
    }

    @Test
    void deserializerParsesIsoLocalDateTime() throws Exception {
        FlexibleLocalDateTimeDeserializer deserializer = new FlexibleLocalDateTimeDeserializer();
        JsonParser parser = createParser("\"2026-06-01T14:30:00\"");
        LocalDateTime result = deserializer.deserialize(parser, null);

        assertEquals(LocalDateTime.of(2026, 6, 1, 14, 30, 0), result);
    }

    @Test
    void deserializerParsesSpaceSeparatedDateTime() throws Exception {
        FlexibleLocalDateTimeDeserializer deserializer = new FlexibleLocalDateTimeDeserializer();
        JsonParser parser = createParser("\"2026-06-01 14:30:00\"");
        LocalDateTime result = deserializer.deserialize(parser, null);

        assertEquals(LocalDateTime.of(2026, 6, 1, 14, 30, 0), result);
    }

    @Test
    void deserializerParsesSpaceSeparatedWithoutSeconds() throws Exception {
        FlexibleLocalDateTimeDeserializer deserializer = new FlexibleLocalDateTimeDeserializer();
        JsonParser parser = createParser("\"2026-06-01 14:30\"");
        LocalDateTime result = deserializer.deserialize(parser, null);

        assertEquals(LocalDateTime.of(2026, 6, 1, 14, 30, 0), result);
    }

    @Test
    void deserializerParsesSlashDateFormat() throws Exception {
        FlexibleLocalDateTimeDeserializer deserializer = new FlexibleLocalDateTimeDeserializer();
        JsonParser parser = createParser("\"2026/06/01 14:30:00\"");
        LocalDateTime result = deserializer.deserialize(parser, null);

        assertEquals(LocalDateTime.of(2026, 6, 1, 14, 30, 0), result);
    }

    @Test
    void deserializerReturnsNullForBlank() throws Exception {
        FlexibleLocalDateTimeDeserializer deserializer = new FlexibleLocalDateTimeDeserializer();
        JsonParser parser = createParser("\"  \"");
        LocalDateTime result = deserializer.deserialize(parser, null);

        assertNull(result);
    }

    @Test
    void deserializerReturnsNullForNull() throws Exception {
        FlexibleLocalDateTimeDeserializer deserializer = new FlexibleLocalDateTimeDeserializer();
        JsonParser parser = createParser("null");
        LocalDateTime result = deserializer.deserialize(parser, null);

        assertNull(result);
    }

    @Test
    void deserializerThrowsOnUnsupportedFormat() throws Exception {
        FlexibleLocalDateTimeDeserializer deserializer = new FlexibleLocalDateTimeDeserializer();
        JsonParser parser = createParser("\"01-06-2026\"");

        assertThrows(Exception.class, () -> deserializer.deserialize(parser, null));
    }

    // =========================================================================
    // 2. FlexibleStringListDeserializer - 字符串数组解析
    // =========================================================================

    @Test
    void stringListDeserializerParsesJsonArray() throws Exception {
        FlexibleStringListDeserializer deserializer = new FlexibleStringListDeserializer();
        JsonParser parser = createParser("[\"AI\",\"学科竞赛\"]");

        List<String> result = deserializer.deserialize(parser, null);

        assertEquals(2, result.size());
        assertEquals("AI", result.get(0));
        assertEquals("学科竞赛", result.get(1));
    }

    @Test
    void stringListDeserializerParsesCommaSeparated() throws Exception {
        FlexibleStringListDeserializer deserializer = new FlexibleStringListDeserializer();
        JsonParser parser = createParser("\"AI,学科竞赛\"");

        List<String> result = deserializer.deserialize(parser, null);

        assertEquals(2, result.size());
        assertEquals("AI", result.get(0));
        assertEquals("学科竞赛", result.get(1));
    }

    @Test
    void stringListDeserializerParsesChineseCommaSeparated() throws Exception {
        FlexibleStringListDeserializer deserializer = new FlexibleStringListDeserializer();
        JsonParser parser = createParser("\"AI，学科竞赛\"");

        List<String> result = deserializer.deserialize(parser, null);

        assertEquals(2, result.size());
        assertEquals("AI", result.get(0));
        assertEquals("学科竞赛", result.get(1));
    }

    @Test
    void stringListDeserializerReturnsEmptyForBlank() throws Exception {
        FlexibleStringListDeserializer deserializer = new FlexibleStringListDeserializer();
        JsonParser parser = createParser("\"  \"");

        List<String> result = deserializer.deserialize(parser, null);

        assertNotNull(result);
        assertEquals(0, result.size());
    }

    @Test
    void stringListDeserializerHandlesSingleElement() throws Exception {
        FlexibleStringListDeserializer deserializer = new FlexibleStringListDeserializer();
        JsonParser parser = createParser("\"AI\"");

        List<String> result = deserializer.deserialize(parser, null);

        assertEquals(1, result.size());
        assertEquals("AI", result.get(0));
    }

    @Test
    void stringListDeserializerTrimsWhitespace() throws Exception {
        FlexibleStringListDeserializer deserializer = new FlexibleStringListDeserializer();
        JsonParser parser = createParser("[\"  AI  \", \"  大数据  \"]");

        List<String> result = deserializer.deserialize(parser, null);

        assertEquals(2, result.size());
        assertEquals("AI", result.get(0));
        assertEquals("大数据", result.get(1));
    }

    @Test
    void stringListDeserializerSkipsBlankInArray() throws Exception {
        FlexibleStringListDeserializer deserializer = new FlexibleStringListDeserializer();
        JsonParser parser = createParser("[\"AI\", \"\", \"大数据\"]");

        List<String> result = deserializer.deserialize(parser, null);

        assertEquals(2, result.size());
        assertEquals("AI", result.get(0));
        assertEquals("大数据", result.get(1));
    }

    // =========================================================================
    // 3. BusinessException - 错误码规范
    // =========================================================================

    @Test
    void businessExceptionDefaultCodeIs400() {
        BusinessException ex = new BusinessException("参数错误");

        assertEquals(400, ex.getCode());
        assertEquals("参数错误", ex.getMessage());
    }

    @Test
    void businessExceptionAcceptsCustomCode() {
        BusinessException ex = new BusinessException(403, "无权限访问");

        assertEquals(403, ex.getCode());
        assertEquals("无权限访问", ex.getMessage());
    }

    @Test
    void businessExceptionIsRuntimeException() {
        BusinessException ex = new BusinessException("test");

        assertNotNull(ex);
        assertEquals(true, ex instanceof RuntimeException);
    }

    // =========================================================================
    // 4. SubmissionServiceImpl.submitSubmission - 状态校验逻辑
    // =========================================================================

    @Test
    void submitSubmissionThrowsWhenRegistrationNotFound() {
        SubmissionServiceImpl service = new SubmissionServiceImpl();
        RegistrationService regService = mock(RegistrationService.class);
        when(regService.getById(999L)).thenReturn(null);
        ReflectionTestUtils.setField(service, "registrationService", regService);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.submitSubmission(1L, 999L, "file.pdf", "/url", 100L));

        assertEquals("关联的报名表不存在", ex.getMessage());
    }

    @Test
    void submitSubmissionThrowsWhenStudentNotOwner() {
        SubmissionServiceImpl service = new SubmissionServiceImpl();
        RegistrationService regService = mock(RegistrationService.class);

        Registration reg = new Registration();
        reg.setId(1L);
        reg.setStudentId(10L); // different student
        reg.setStatus("已提交");
        when(regService.getById(1L)).thenReturn(reg);
        ReflectionTestUtils.setField(service, "registrationService", regService);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.submitSubmission(1L, 1L, "file.pdf", "/url", 100L));

        assertEquals("您无权为此报名表提交成果附件", ex.getMessage());
    }

    @Test
    void submitSubmissionThrowsWhenStatusIs审核驳回() {
        SubmissionServiceImpl service = new SubmissionServiceImpl();
        RegistrationService regService = mock(RegistrationService.class);

        Registration reg = new Registration();
        reg.setId(1L);
        reg.setStudentId(1L);
        reg.setStatus("审核驳回");
        when(regService.getById(1L)).thenReturn(reg);
        ReflectionTestUtils.setField(service, "registrationService", regService);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.submitSubmission(1L, 1L, "file.pdf", "/url", 100L));

        assertEquals("当前报名状态不允许提交成果，请确认报名已提交、已审核通过或被退回补充", ex.getMessage());
    }

    @Test
    void submitSubmissionThrowsWhenStatusIs待完善() {
        SubmissionServiceImpl service = new SubmissionServiceImpl();
        RegistrationService regService = mock(RegistrationService.class);

        Registration reg = new Registration();
        reg.setId(1L);
        reg.setStudentId(1L);
        reg.setStatus("待完善");
        when(regService.getById(1L)).thenReturn(reg);
        ReflectionTestUtils.setField(service, "registrationService", regService);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.submitSubmission(1L, 1L, "file.pdf", "/url", 100L));

        assertEquals("当前报名状态不允许提交成果，请确认报名已提交、已审核通过或被退回补充", ex.getMessage());
    }

    @Test
    void submitSubmissionAllowsStatus已提交() {
        SubmissionServiceImpl service = new SubmissionServiceImpl();
        RegistrationService regService = mock(RegistrationService.class);
        CompetitionService compService = mock(CompetitionService.class);
        ReviewTaskService reviewTaskService = mock(ReviewTaskService.class);
        SubmissionStudentService ssService = mock(SubmissionStudentService.class);

        Registration reg = new Registration();
        reg.setId(1L);
        reg.setStudentId(1L);
        reg.setCompetitionId(10L);
        reg.setStatus("已提交");
        when(regService.getById(1L)).thenReturn(reg);

        Competition comp = new Competition();
        comp.setId(10L);
        comp.setName("蓝桥杯");
        when(compService.getById(10L)).thenReturn(comp);

        // Mock the count method (no pending submissions)
        // We need to mock the base IService.count() method
        // Since ServiceImpl delegates to baseMapper, we mock via reflection
        SubmissionServiceImpl spyService = mock(SubmissionServiceImpl.class);
        when(spyService.count(any(Wrapper.class))).thenReturn(0L);
        // Instead, use a different approach - just verify no exception for allowed statuses

        ReflectionTestUtils.setField(service, "registrationService", regService);
        ReflectionTestUtils.setField(service, "competitionService", compService);
        ReflectionTestUtils.setField(service, "reviewTaskService", reviewTaskService);
        ReflectionTestUtils.setField(service, "submissionStudentService", ssService);

        // The method will fail at `this.count()` because baseMapper is null,
        // but it passed the status validation. We verify the status check passed
        // by catching the NPE (which happens AFTER the status check).
        try {
            service.submitSubmission(1L, 1L, "file.pdf", "/url", 100L);
        } catch (BusinessException ex) {
            // Should NOT be a status-related business exception
            if (ex.getMessage().contains("报名状态不允许")) {
                throw new AssertionError("Status check should have passed for '已提交'");
            }
        } catch (Exception ignored) {
            // NPE from baseMapper is expected - status check passed
        }
    }

    @Test
    void submitSubmissionAllowsStatus审核通过() {
        SubmissionServiceImpl service = new SubmissionServiceImpl();
        RegistrationService regService = mock(RegistrationService.class);

        Registration reg = new Registration();
        reg.setId(1L);
        reg.setStudentId(1L);
        reg.setCompetitionId(10L);
        reg.setStatus("审核通过");
        when(regService.getById(1L)).thenReturn(reg);

        ReflectionTestUtils.setField(service, "registrationService", regService);

        try {
            service.submitSubmission(1L, 1L, "file.pdf", "/url", 100L);
        } catch (BusinessException ex) {
            if (ex.getMessage().contains("报名状态不允许")) {
                throw new AssertionError("Status check should have passed for '审核通过'");
            }
        } catch (Exception ignored) {
            // expected - status check passed
        }
    }

    @Test
    void submitSubmissionAllowsStatus退回补充() {
        SubmissionServiceImpl service = new SubmissionServiceImpl();
        RegistrationService regService = mock(RegistrationService.class);

        Registration reg = new Registration();
        reg.setId(1L);
        reg.setStudentId(1L);
        reg.setCompetitionId(10L);
        reg.setStatus("退回补充");
        when(regService.getById(1L)).thenReturn(reg);

        ReflectionTestUtils.setField(service, "registrationService", regService);

        try {
            service.submitSubmission(1L, 1L, "file.pdf", "/url", 100L);
        } catch (BusinessException ex) {
            if (ex.getMessage().contains("报名状态不允许")) {
                throw new AssertionError("Status check should have passed for '退回补充'");
            }
        } catch (Exception ignored) {
            // expected - status check passed
        }
    }

    // =========================================================================
    // 5. RegistrationServiceImpl - 状态流转
    // =========================================================================

    @Test
    void registrationAuditApproveSets审核通过() {
        RegistrationServiceImpl service = new RegistrationServiceImpl();
        CompetitionService compService = mock(CompetitionService.class);
        MessageService msgService = mock(MessageService.class);
        GrowthRecordService growthService = mock(GrowthRecordService.class);
        ReviewTaskService reviewTaskService = mock(ReviewTaskService.class);
        SubmissionService subService = mock(SubmissionService.class);
        RegistrationMapper regMapper = mock(RegistrationMapper.class);

        Registration reg = new Registration();
        reg.setId(1L);
        reg.setStudentId(4L);
        reg.setCompetitionId(10L);
        reg.setStatus("已提交");

        Competition comp = new Competition();
        comp.setId(10L);
        comp.setName("蓝桥杯");

        when(regMapper.selectById(1L)).thenReturn(reg);
        when(compService.getById(10L)).thenReturn(comp);
        when(subService.list(any(Wrapper.class))).thenReturn(List.of());

        ReflectionTestUtils.setField(service, "baseMapper", regMapper);
        ReflectionTestUtils.setField(service, "competitionService", compService);
        ReflectionTestUtils.setField(service, "messageService", msgService);
        ReflectionTestUtils.setField(service, "growthRecordService", growthService);
        ReflectionTestUtils.setField(service, "reviewTaskService", reviewTaskService);
        ReflectionTestUtils.setField(service, "submissionService", subService);

        service.audit(1L, 2L, true, "通过");

        assertEquals("审核通过", reg.getStatus());
    }

    @Test
    void registrationAuditRejectSets审核驳回() {
        RegistrationServiceImpl service = new RegistrationServiceImpl();
        CompetitionService compService = mock(CompetitionService.class);
        MessageService msgService = mock(MessageService.class);
        GrowthRecordService growthService = mock(GrowthRecordService.class);
        ReviewTaskService reviewTaskService = mock(ReviewTaskService.class);
        SubmissionService subService = mock(SubmissionService.class);
        RegistrationMapper regMapper = mock(RegistrationMapper.class);

        Registration reg = new Registration();
        reg.setId(1L);
        reg.setStudentId(4L);
        reg.setCompetitionId(10L);
        reg.setStatus("已提交");

        Competition comp = new Competition();
        comp.setId(10L);
        comp.setName("蓝桥杯");

        when(regMapper.selectById(1L)).thenReturn(reg);
        when(compService.getById(10L)).thenReturn(comp);
        when(subService.list(any(Wrapper.class))).thenReturn(List.of());

        ReflectionTestUtils.setField(service, "baseMapper", regMapper);
        ReflectionTestUtils.setField(service, "competitionService", compService);
        ReflectionTestUtils.setField(service, "messageService", msgService);
        ReflectionTestUtils.setField(service, "growthRecordService", growthService);
        ReflectionTestUtils.setField(service, "reviewTaskService", reviewTaskService);
        ReflectionTestUtils.setField(service, "submissionService", subService);

        service.audit(1L, 2L, false, "不符合要求");

        assertEquals("审核驳回", reg.getStatus());
    }

    @Test
    void registrationAuditReturnSets退回补充() {
        RegistrationServiceImpl service = new RegistrationServiceImpl();
        CompetitionService compService = mock(CompetitionService.class);
        MessageService msgService = mock(MessageService.class);
        GrowthRecordService growthService = mock(GrowthRecordService.class);
        ReviewTaskService reviewTaskService = mock(ReviewTaskService.class);
        SubmissionService subService = mock(SubmissionService.class);
        RegistrationMapper regMapper = mock(RegistrationMapper.class);

        Registration reg = new Registration();
        reg.setId(1L);
        reg.setStudentId(4L);
        reg.setCompetitionId(10L);
        reg.setStatus("审核中");

        Competition comp = new Competition();
        comp.setId(10L);
        comp.setName("蓝桥杯");

        when(regMapper.selectById(1L)).thenReturn(reg);
        when(compService.getById(10L)).thenReturn(comp);
        when(subService.list(any(Wrapper.class))).thenReturn(List.of());

        ReflectionTestUtils.setField(service, "baseMapper", regMapper);
        ReflectionTestUtils.setField(service, "competitionService", compService);
        ReflectionTestUtils.setField(service, "messageService", msgService);
        ReflectionTestUtils.setField(service, "growthRecordService", growthService);
        ReflectionTestUtils.setField(service, "reviewTaskService", reviewTaskService);
        ReflectionTestUtils.setField(service, "submissionService", subService);

        service.audit(1L, 2L, false, "【退回补充】请补充指导老师信息");

        assertEquals("退回补充", reg.getStatus());
    }

    @Test
    void registrationAuditThrowsWhenAlreadyProcessed() {
        RegistrationServiceImpl service = new RegistrationServiceImpl();
        RegistrationMapper regMapper = mock(RegistrationMapper.class);

        Registration reg = new Registration();
        reg.setId(1L);
        reg.setStudentId(4L);
        reg.setCompetitionId(10L);
        reg.setStatus("审核通过"); // already processed

        when(regMapper.selectById(1L)).thenReturn(reg);
        ReflectionTestUtils.setField(service, "baseMapper", regMapper);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.audit(1L, 2L, true, null));

        assertEquals("该报名申请已处理完毕", ex.getMessage());
    }

    @Test
    void registrationAuditThrowsWhenNotFound() {
        RegistrationServiceImpl service = new RegistrationServiceImpl();
        RegistrationMapper regMapper = mock(RegistrationMapper.class);

        when(regMapper.selectById(999L)).thenReturn(null);
        ReflectionTestUtils.setField(service, "baseMapper", regMapper);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.audit(999L, 2L, true, null));

        assertEquals("报名表不存在", ex.getMessage());
    }

    @Test
    void registrationAuditSyncsLinkedSubmissionStatus() {
        RegistrationServiceImpl service = new RegistrationServiceImpl();
        CompetitionService compService = mock(CompetitionService.class);
        MessageService msgService = mock(MessageService.class);
        GrowthRecordService growthService = mock(GrowthRecordService.class);
        ReviewTaskService reviewTaskService = mock(ReviewTaskService.class);
        SubmissionService subService = mock(SubmissionService.class);
        RegistrationMapper regMapper = mock(RegistrationMapper.class);

        Registration reg = new Registration();
        reg.setId(1L);
        reg.setStudentId(4L);
        reg.setCompetitionId(10L);
        reg.setStatus("已提交");

        Competition comp = new Competition();
        comp.setId(10L);
        comp.setName("蓝桥杯");

        Submission linkedSub = new Submission();
        linkedSub.setId(100L);
        linkedSub.setRegistrationId(1L);
        linkedSub.setStatus("待审核");

        when(regMapper.selectById(1L)).thenReturn(reg);
        when(compService.getById(10L)).thenReturn(comp);
        when(subService.list(any(Wrapper.class))).thenReturn(List.of(linkedSub));

        ReflectionTestUtils.setField(service, "baseMapper", regMapper);
        ReflectionTestUtils.setField(service, "competitionService", compService);
        ReflectionTestUtils.setField(service, "messageService", msgService);
        ReflectionTestUtils.setField(service, "growthRecordService", growthService);
        ReflectionTestUtils.setField(service, "reviewTaskService", reviewTaskService);
        ReflectionTestUtils.setField(service, "submissionService", subService);

        service.audit(1L, 2L, true, "通过");

        // Verify the linked submission was updated
        verify(subService).updateById(linkedSub);
        assertEquals("已审核", linkedSub.getStatus());
        assertEquals(true, linkedSub.getApproved());
    }

    // =========================================================================
    // 6. GrowthRecordServiceImpl - 成长数据计算
    // =========================================================================

    @Test
    void growthDataStartsWithBaseline60() {
        GrowthRecordServiceImpl service = new GrowthRecordServiceImpl();
        RegistrationService regService = mock(RegistrationService.class);
        SubmissionService subService = mock(SubmissionService.class);
        CompetitionService compService = mock(CompetitionService.class);

        when(regService.list(any(Wrapper.class))).thenReturn(List.of());
        when(subService.list(any(Wrapper.class))).thenReturn(List.of());

        ReflectionTestUtils.setField(service, "registrationService", regService);
        ReflectionTestUtils.setField(service, "submissionService", subService);
        ReflectionTestUtils.setField(service, "competitionService", compService);

        StudentGrowthVO result = service.getStudentGrowth(1L);

        assertEquals(60, result.getRadarData().getInnovation());
        assertEquals(60, result.getRadarData().getEngineering());
        assertEquals(60, result.getRadarData().getProgramming());
        assertEquals(60, result.getRadarData().getWriting());
        assertEquals(60, result.getRadarData().getTeamwork());
        assertEquals(0, result.getTotalCompetitions());
        assertEquals(0, result.getAwards());
    }

    @Test
    void growthDataTeamRegistrationBoostsTeamwork() {
        GrowthRecordServiceImpl service = new GrowthRecordServiceImpl();
        RegistrationService regService = mock(RegistrationService.class);
        SubmissionService subService = mock(SubmissionService.class);
        CompetitionService compService = mock(CompetitionService.class);

        Registration teamReg = new Registration();
        teamReg.setId(1L);
        teamReg.setStudentId(1L);
        teamReg.setCompetitionId(10L);
        teamReg.setTeamName("梦之队"); // team registration

        Registration soloReg = new Registration();
        soloReg.setId(2L);
        soloReg.setStudentId(1L);
        soloReg.setCompetitionId(20L);
        soloReg.setTeamName(null); // solo registration

        when(regService.list(any(Wrapper.class))).thenReturn(List.of(teamReg, soloReg));
        when(subService.list(any(Wrapper.class))).thenReturn(List.of());

        ReflectionTestUtils.setField(service, "registrationService", regService);
        ReflectionTestUtils.setField(service, "submissionService", subService);
        ReflectionTestUtils.setField(service, "competitionService", compService);

        StudentGrowthVO result = service.getStudentGrowth(1L);

        // Baseline 60 + 8 (team) + 2 (solo) = 70
        assertEquals(70, result.getRadarData().getTeamwork());
        assertEquals(2, result.getTotalCompetitions());
    }

    @Test
    void growthDataCategoryABoostsInnovationAndProgramming() {
        GrowthRecordServiceImpl service = new GrowthRecordServiceImpl();
        RegistrationService regService = mock(RegistrationService.class);
        SubmissionService subService = mock(SubmissionService.class);
        CompetitionService compService = mock(CompetitionService.class);

        Registration reg = new Registration();
        reg.setId(1L);
        reg.setStudentId(1L);
        reg.setCompetitionId(10L);
        reg.setTeamName("队伍");

        Submission approved = new Submission();
        approved.setId(1L);
        approved.setRegistrationId(1L);
        approved.setStatus("已审核");
        approved.setApproved(true);

        Competition comp = new Competition();
        comp.setId(10L);
        comp.setCategory("A");

        when(regService.list(any(Wrapper.class))).thenReturn(List.of(reg));
        when(subService.list(any(Wrapper.class))).thenReturn(List.of(approved));
        when(compService.getById(10L)).thenReturn(comp);

        ReflectionTestUtils.setField(service, "registrationService", regService);
        ReflectionTestUtils.setField(service, "submissionService", subService);
        ReflectionTestUtils.setField(service, "competitionService", compService);

        StudentGrowthVO result = service.getStudentGrowth(1L);

        // innovation: 60 + 12 = 72
        assertEquals(72, result.getRadarData().getInnovation());
        // programming: 60 + 6 = 66
        assertEquals(66, result.getRadarData().getProgramming());
        // engineering: 60 + 4 = 64
        assertEquals(64, result.getRadarData().getEngineering());
        // writing: 60 + 10 = 70
        assertEquals(70, result.getRadarData().getWriting());
    }

    @Test
    void growthDataCategoryBBoostsInnovationAndWriting() {
        GrowthRecordServiceImpl service = new GrowthRecordServiceImpl();
        RegistrationService regService = mock(RegistrationService.class);
        SubmissionService subService = mock(SubmissionService.class);
        CompetitionService compService = mock(CompetitionService.class);

        Registration reg = new Registration();
        reg.setId(1L);
        reg.setStudentId(1L);
        reg.setCompetitionId(10L);

        Submission approved = new Submission();
        approved.setId(1L);
        approved.setRegistrationId(1L);
        approved.setStatus("已审核");
        approved.setApproved(true);

        Competition comp = new Competition();
        comp.setId(10L);
        comp.setCategory("B");

        when(regService.list(any(Wrapper.class))).thenReturn(List.of(reg));
        when(subService.list(any(Wrapper.class))).thenReturn(List.of(approved));
        when(compService.getById(10L)).thenReturn(comp);

        ReflectionTestUtils.setField(service, "registrationService", regService);
        ReflectionTestUtils.setField(service, "submissionService", subService);
        ReflectionTestUtils.setField(service, "competitionService", compService);

        StudentGrowthVO result = service.getStudentGrowth(1L);

        // innovation: 60 + 12 = 72
        assertEquals(72, result.getRadarData().getInnovation());
        // writing: 60 + 10 + 5 = 75
        assertEquals(75, result.getRadarData().getWriting());
    }

    @Test
    void growthDataCategoryCBoostsWritingAndTeamwork() {
        GrowthRecordServiceImpl service = new GrowthRecordServiceImpl();
        RegistrationService regService = mock(RegistrationService.class);
        SubmissionService subService = mock(SubmissionService.class);
        CompetitionService compService = mock(CompetitionService.class);

        Registration reg = new Registration();
        reg.setId(1L);
        reg.setStudentId(1L);
        reg.setCompetitionId(10L);

        Submission approved = new Submission();
        approved.setId(1L);
        approved.setRegistrationId(1L);
        approved.setStatus("已审核");
        approved.setApproved(true);

        Competition comp = new Competition();
        comp.setId(10L);
        comp.setCategory("C");

        when(regService.list(any(Wrapper.class))).thenReturn(List.of(reg));
        when(subService.list(any(Wrapper.class))).thenReturn(List.of(approved));
        when(compService.getById(10L)).thenReturn(comp);

        ReflectionTestUtils.setField(service, "registrationService", regService);
        ReflectionTestUtils.setField(service, "submissionService", subService);
        ReflectionTestUtils.setField(service, "competitionService", compService);

        StudentGrowthVO result = service.getStudentGrowth(1L);

        // writing: 60 + 10 + 12 = 82
        assertEquals(82, result.getRadarData().getWriting());
        // teamwork: 60 + 2 (solo reg) + 5 (C category) = 67
        assertEquals(67, result.getRadarData().getTeamwork());
        // engineering: 60 + 4 = 64
        assertEquals(64, result.getRadarData().getEngineering());
    }

    @Test
    void growthDataScoresCapAt99() {
        GrowthRecordServiceImpl service = new GrowthRecordServiceImpl();
        RegistrationService regService = mock(RegistrationService.class);
        SubmissionService subService = mock(SubmissionService.class);
        CompetitionService compService = mock(CompetitionService.class);

        // Create many registrations with team names to push teamwork high
        java.util.ArrayList<Registration> manyRegs = new java.util.ArrayList<>();
        for (int i = 0; i < 10; i++) {
            Registration reg = new Registration();
            reg.setId((long) i);
            reg.setStudentId(1L);
            reg.setCompetitionId(10L);
            reg.setTeamName("队伍" + i);
            manyRegs.add(reg);
        }

        when(regService.list(any(Wrapper.class))).thenReturn(manyRegs);
        when(subService.list(any(Wrapper.class))).thenReturn(List.of());

        ReflectionTestUtils.setField(service, "registrationService", regService);
        ReflectionTestUtils.setField(service, "submissionService", subService);
        ReflectionTestUtils.setField(service, "competitionService", compService);

        StudentGrowthVO result = service.getStudentGrowth(1L);

        // teamwork: 60 + 8*10 = 140, capped at 99
        assertEquals(99, result.getRadarData().getTeamwork());
    }

    @Test
    void growthDataOnlyCountsApprovedSubmissions() {
        GrowthRecordServiceImpl service = new GrowthRecordServiceImpl();
        RegistrationService regService = mock(RegistrationService.class);
        SubmissionService subService = mock(SubmissionService.class);
        CompetitionService compService = mock(CompetitionService.class);

        Registration reg = new Registration();
        reg.setId(1L);
        reg.setStudentId(1L);
        reg.setCompetitionId(10L);

        Submission approved = new Submission();
        approved.setId(1L);
        approved.setRegistrationId(1L);
        approved.setStatus("已审核");
        approved.setApproved(true);

        Submission rejected = new Submission();
        rejected.setId(2L);
        rejected.setRegistrationId(1L);
        rejected.setStatus("已审核");
        rejected.setApproved(false);

        Submission pending = new Submission();
        pending.setId(3L);
        pending.setRegistrationId(1L);
        pending.setStatus("待审核");
        pending.setApproved(null);

        Competition comp = new Competition();
        comp.setId(10L);
        comp.setCategory("A");

        when(regService.list(any(Wrapper.class))).thenReturn(List.of(reg));
        when(subService.list(any(Wrapper.class))).thenReturn(List.of(approved, rejected, pending));
        when(compService.getById(10L)).thenReturn(comp);

        ReflectionTestUtils.setField(service, "registrationService", regService);
        ReflectionTestUtils.setField(service, "submissionService", subService);
        ReflectionTestUtils.setField(service, "competitionService", compService);

        StudentGrowthVO result = service.getStudentGrowth(1L);

        assertEquals(1, result.getAwards());
    }

    @Test
    void growthDataHandlesNullCategoryGracefully() {
        GrowthRecordServiceImpl service = new GrowthRecordServiceImpl();
        RegistrationService regService = mock(RegistrationService.class);
        SubmissionService subService = mock(SubmissionService.class);
        CompetitionService compService = mock(CompetitionService.class);

        Registration reg = new Registration();
        reg.setId(1L);
        reg.setStudentId(1L);
        reg.setCompetitionId(10L);

        Submission approved = new Submission();
        approved.setId(1L);
        approved.setRegistrationId(1L);
        approved.setStatus("已审核");
        approved.setApproved(true);

        Competition comp = new Competition();
        comp.setId(10L);
        comp.setCategory(null); // null category

        when(regService.list(any(Wrapper.class))).thenReturn(List.of(reg));
        when(subService.list(any(Wrapper.class))).thenReturn(List.of(approved));
        when(compService.getById(10L)).thenReturn(comp);

        ReflectionTestUtils.setField(service, "registrationService", regService);
        ReflectionTestUtils.setField(service, "submissionService", subService);
        ReflectionTestUtils.setField(service, "competitionService", compService);

        StudentGrowthVO result = service.getStudentGrowth(1L);

        // null category: StrUtil.isNotBlank(null) is false, so no category branch executes
        // Only writing += 10 (base boost for approved deliverable)
        // innovation: 60 (unchanged)
        assertEquals(60, result.getRadarData().getInnovation());
        // engineering: 60 (unchanged)
        assertEquals(60, result.getRadarData().getEngineering());
        // writing: 60 + 10 = 70
        assertEquals(70, result.getRadarData().getWriting());
    }

    // =========================================================================
    // Helper
    // =========================================================================

    private JsonParser createParser(String json) throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        JsonParser parser = mapper.getFactory().createParser(json);
        parser.nextToken(); // advance to first token
        return parser;
    }

}
