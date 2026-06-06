package com.etsaion;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.etsaion.entity.AwardProof;
import com.etsaion.entity.AwardProofStudent;
import com.etsaion.entity.User;
import com.etsaion.exception.BusinessException;
import com.etsaion.mapper.AwardProofMapper;
import com.etsaion.service.AwardProofStudentService;
import com.etsaion.service.CompetitionService;
import com.etsaion.service.GrowthRecordService;
import com.etsaion.service.MessageService;
import com.etsaion.service.ReviewTaskService;
import com.etsaion.service.UserService;
import com.etsaion.service.impl.AwardProofServiceImpl;
import com.etsaion.vo.ai.AwardProofVO;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AwardProofPermissionTest {

    @Test
    void linkedStudentCanViewOwnAwardProof() {
        AwardProofMapper mapper = mock(AwardProofMapper.class);
        AwardProofStudentService studentLinkService = mock(AwardProofStudentService.class);
        UserService userService = mock(UserService.class);
        AwardProofServiceImpl service = awardProofService(mapper, studentLinkService, userService);

        AwardProof proof = awardProof(1L, 10L, "pending");
        when(mapper.selectById(1L)).thenReturn(proof);
        when(studentLinkService.count(any(Wrapper.class))).thenReturn(1L);
        when(studentLinkService.list(any(Wrapper.class))).thenReturn(List.of(link(1L, 4L)));
        when(userService.getById(10L)).thenReturn(user(10L, "student", "计算机学院"));
        when(userService.listByIds(anyCollection())).thenReturn(List.of(user(4L, "student", "计算机学院")));

        AwardProofVO detail = service.getAwardProofDetail(1L, 4L, "student");

        assertEquals(1L, detail.getId());
        assertEquals(1, detail.getStudents().size());
        assertEquals(4L, detail.getStudents().get(0).getStudentId());
    }

    @Test
    void unlinkedStudentCannotViewAwardProof() {
        AwardProofMapper mapper = mock(AwardProofMapper.class);
        AwardProofStudentService studentLinkService = mock(AwardProofStudentService.class);
        AwardProofServiceImpl service = awardProofService(mapper, studentLinkService, mock(UserService.class));

        when(mapper.selectById(1L)).thenReturn(awardProof(1L, 10L, "pending"));
        when(studentLinkService.count(any(Wrapper.class))).thenReturn(0L);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.getAwardProofDetail(1L, 99L, "student"));

        assertEquals(403, ex.getCode());
        assertEquals("无权查看该获奖证明", ex.getMessage());
    }

    @Test
    void teacherCanViewSameCollegeAwardProof() {
        AwardProofMapper mapper = mock(AwardProofMapper.class);
        AwardProofStudentService studentLinkService = mock(AwardProofStudentService.class);
        UserService userService = mock(UserService.class);
        AwardProofServiceImpl service = awardProofService(mapper, studentLinkService, userService);

        when(mapper.selectById(1L)).thenReturn(awardProof(1L, 4L, "pending"));
        when(studentLinkService.list(any(Wrapper.class))).thenReturn(List.of(link(1L, 4L), link(1L, 5L)));
        when(userService.getById(2L)).thenReturn(user(2L, "teacher", "计算机学院"));
        when(userService.getById(4L)).thenReturn(user(4L, "student", "计算机学院"));
        when(userService.listByIds(anyCollection())).thenReturn(List.of(
                user(4L, "student", "计算机学院"),
                user(5L, "student", "计算机学院")
        ));

        AwardProofVO detail = service.getAwardProofDetail(1L, 2L, "teacher");

        assertEquals(1L, detail.getId());
        assertEquals(2, detail.getStudents().size());
    }

    @Test
    void teacherCannotReviewOtherCollegeAwardProof() {
        AwardProofMapper mapper = mock(AwardProofMapper.class);
        AwardProofStudentService studentLinkService = mock(AwardProofStudentService.class);
        UserService userService = mock(UserService.class);
        ReviewTaskService reviewTaskService = mock(ReviewTaskService.class);
        AwardProofServiceImpl service = awardProofService(mapper, studentLinkService, userService,
                mock(CompetitionService.class), mock(MessageService.class), mock(GrowthRecordService.class),
                reviewTaskService);

        when(mapper.selectById(1L)).thenReturn(awardProof(1L, 4L, "pending"));
        when(studentLinkService.list(any(Wrapper.class))).thenReturn(List.of(link(1L, 4L)));
        when(userService.getById(2L)).thenReturn(user(2L, "teacher", "计算机学院"));
        when(userService.listByIds(anyCollection())).thenReturn(List.of(user(4L, "student", "外国语学院")));

        com.etsaion.dto.ai.AwardProofReviewDTO dto = new com.etsaion.dto.ai.AwardProofReviewDTO();
        dto.setId(1L);
        dto.setAction("approve");

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.reviewAwardProof(2L, "teacher", dto));

        assertEquals(403, ex.getCode());
        assertEquals("无权审核其他学院学生的获奖证明", ex.getMessage());
        verify(mapper, never()).updateById(any(AwardProof.class));
        verify(reviewTaskService, never()).resolveTarget(any(), any(), any(), any());
    }

    @Test
    void adminCanViewAnyAwardProofWithoutStudentCollegeCheck() {
        AwardProofMapper mapper = mock(AwardProofMapper.class);
        AwardProofStudentService studentLinkService = mock(AwardProofStudentService.class);
        UserService userService = mock(UserService.class);
        AwardProofServiceImpl service = awardProofService(mapper, studentLinkService, userService);

        when(mapper.selectById(1L)).thenReturn(awardProof(1L, 4L, "pending"));
        when(studentLinkService.list(any(Wrapper.class))).thenReturn(List.of(link(1L, 4L)));
        when(userService.getById(4L)).thenReturn(user(4L, "student", "外国语学院"));
        when(userService.listByIds(anyCollection())).thenReturn(List.of(user(4L, "student", "外国语学院")));

        AwardProofVO detail = service.getAwardProofDetail(1L, 1L, "admin");

        assertEquals(1L, detail.getId());
        assertEquals("外国语学院", detail.getStudents().get(0).getCollege());
    }

    private AwardProofServiceImpl awardProofService(AwardProofMapper mapper,
                                                    AwardProofStudentService studentLinkService,
                                                    UserService userService) {
        return awardProofService(mapper, studentLinkService, userService, mock(CompetitionService.class),
                mock(MessageService.class), mock(GrowthRecordService.class), mock(ReviewTaskService.class));
    }

    private AwardProofServiceImpl awardProofService(AwardProofMapper mapper,
                                                    AwardProofStudentService studentLinkService,
                                                    UserService userService,
                                                    CompetitionService competitionService,
                                                    MessageService messageService,
                                                    GrowthRecordService growthRecordService,
                                                    ReviewTaskService reviewTaskService) {
        AwardProofServiceImpl service = new AwardProofServiceImpl();
        ReflectionTestUtils.setField(service, "baseMapper", mapper);
        ReflectionTestUtils.setField(service, "awardProofStudentService", studentLinkService);
        ReflectionTestUtils.setField(service, "userService", userService);
        ReflectionTestUtils.setField(service, "competitionService", competitionService);
        ReflectionTestUtils.setField(service, "messageService", messageService);
        ReflectionTestUtils.setField(service, "growthRecordService", growthRecordService);
        ReflectionTestUtils.setField(service, "reviewTaskService", reviewTaskService);
        return service;
    }

    private AwardProof awardProof(Long id, Long submitterId, String status) {
        AwardProof proof = new AwardProof();
        proof.setId(id);
        proof.setSubmitterId(submitterId);
        proof.setCompetitionName("AI 创新挑战赛");
        proof.setAwardLevel("一等奖");
        proof.setStatus(status);
        return proof;
    }

    private AwardProofStudent link(Long proofId, Long studentId) {
        AwardProofStudent link = new AwardProofStudent();
        link.setAwardProofId(proofId);
        link.setStudentId(studentId);
        return link;
    }

    private User user(Long id, String role, String college) {
        User user = new User();
        user.setId(id);
        user.setRole(role);
        user.setUsername("u" + id);
        user.setRealName("用户" + id);
        user.setCollege(college);
        return user;
    }
}
