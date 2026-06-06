package com.etsaion;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.etsaion.dto.ai.AwardProofReviewDTO;
import com.etsaion.entity.AwardProof;
import com.etsaion.entity.AwardProofStudent;
import com.etsaion.entity.GrowthRecord;
import com.etsaion.entity.Message;
import com.etsaion.mapper.AwardProofMapper;
import com.etsaion.service.AwardProofStudentService;
import com.etsaion.service.CompetitionService;
import com.etsaion.service.GrowthRecordService;
import com.etsaion.service.MessageService;
import com.etsaion.service.ReviewTaskService;
import com.etsaion.service.UserService;
import com.etsaion.service.impl.AwardProofServiceImpl;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AwardProofFlowTest {

    @Test
    void approveAwardProofWritesMessageGrowthRecordAndResolvesReviewTask() {
        AwardProofMapper mapper = mock(AwardProofMapper.class);
        AwardProofStudentService studentLinkService = mock(AwardProofStudentService.class);
        MessageService messageService = mock(MessageService.class);
        GrowthRecordService growthRecordService = mock(GrowthRecordService.class);
        ReviewTaskService reviewTaskService = mock(ReviewTaskService.class);
        AwardProofServiceImpl service = new AwardProofServiceImpl();
        ReflectionTestUtils.setField(service, "baseMapper", mapper);
        ReflectionTestUtils.setField(service, "awardProofStudentService", studentLinkService);
        ReflectionTestUtils.setField(service, "userService", mock(UserService.class));
        ReflectionTestUtils.setField(service, "competitionService", mock(CompetitionService.class));
        ReflectionTestUtils.setField(service, "messageService", messageService);
        ReflectionTestUtils.setField(service, "growthRecordService", growthRecordService);
        ReflectionTestUtils.setField(service, "reviewTaskService", reviewTaskService);

        LocalDateTime awardTime = LocalDateTime.of(2026, 5, 20, 9, 30);
        AwardProof proof = new AwardProof();
        proof.setId(1L);
        proof.setSubmitterId(4L);
        proof.setCompetitionId(10L);
        proof.setCompetitionName("AI 创新挑战赛");
        proof.setAwardLevel("一等奖");
        proof.setAwardTime(awardTime);
        proof.setStatus("pending");

        AwardProofStudent link = new AwardProofStudent();
        link.setAwardProofId(1L);
        link.setStudentId(4L);

        when(mapper.selectById(1L)).thenReturn(proof);
        when(mapper.updateById(any(AwardProof.class))).thenReturn(1);
        when(studentLinkService.list(any(Wrapper.class))).thenReturn(List.of(link));
        when(messageService.save(any(Message.class))).thenReturn(true);
        when(growthRecordService.count(any(Wrapper.class))).thenReturn(0L);
        when(growthRecordService.save(any(GrowthRecord.class))).thenReturn(true);

        AwardProofReviewDTO dto = new AwardProofReviewDTO();
        dto.setId(1L);
        dto.setAction("approve");
        dto.setReviewNote("材料真实，审核通过");

        service.reviewAwardProof(2L, "admin", dto);

        assertEquals("approved", proof.getStatus());
        assertEquals(2L, proof.getReviewerId());
        assertEquals("材料真实，审核通过", proof.getReviewNote());
        assertNotNull(proof.getReviewTime());

        ArgumentCaptor<Message> messageCaptor = ArgumentCaptor.forClass(Message.class);
        verify(messageService).save(messageCaptor.capture());
        Message message = messageCaptor.getValue();
        assertEquals(2L, message.getFromUser());
        assertEquals(4L, message.getToUser());
        assertEquals("您的获奖证明已审核通过", message.getTitle());
        assertTrue(message.getContent().contains("AI 创新挑战赛 - 一等奖"));
        assertEquals(0, message.getIsRead());

        ArgumentCaptor<GrowthRecord> growthCaptor = ArgumentCaptor.forClass(GrowthRecord.class);
        verify(growthRecordService).save(growthCaptor.capture());
        GrowthRecord record = growthCaptor.getValue();
        assertEquals(4L, record.getStudentId());
        assertEquals(10L, record.getCompetitionId());
        assertEquals("award", record.getRecordType());
        assertEquals("AI 创新挑战赛 一等奖", record.getTitle());
        assertEquals(awardTime, record.getHappenTime());

        verify(reviewTaskService).resolveTarget("award_proof", 1L, 2L, "材料真实，审核通过");
        verify(mapper).updateById(proof);
    }
}
