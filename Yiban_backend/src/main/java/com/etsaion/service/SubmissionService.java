package com.etsaion.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.etsaion.entity.Submission;
import com.etsaion.enums.AuditAction;
import com.etsaion.vo.SubmissionVO;

import java.util.List;

public interface SubmissionService extends IService<Submission> {
    Submission submitSubmission(Long studentId, Long registrationId, String fileName, String fileUrl, Long fileSize);

    /**
     * 审核成果。成果落定后，它所属的报名也随之落定。
     *
     * @param reviewNote 审核意见纯文本，不含任何状态标记
     */
    void reviewSubmission(Long teacherId, Long submissionId, AuditAction action, String reviewNote);

    Page<SubmissionVO> listSubmissions(int current, int size, String status, String keyword);
    List<SubmissionVO> listExcellent();
    Page<SubmissionVO> listExcellentPage(int current, int size);
    void toggleDisplay(Long submissionId, Boolean displayed);
    void updateReviewNote(Long submissionId, String reviewNote);
    void updateSubmissionFile(Long submissionId, String fileName, String fileUrl, Long fileSize);
    Submission adminCreateExcellent(Long competitionId, String fileName, String fileUrl, Long fileSize, String reviewNote);

    List<Submission> submitTeamSubmission(Long submitterId, Long competitionId, String fileName, String fileUrl, Long fileSize, List<Long> studentIds);

    List<SubmissionVO> listMySubmissions(Long studentId);
}
