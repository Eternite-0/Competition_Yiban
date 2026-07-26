package com.etsaion.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.etsaion.dto.ai.AwardProofReviewDTO;
import com.etsaion.dto.ai.AwardProofSubmitDTO;
import com.etsaion.dto.ai.CertificateRecognizeDTO;
import com.etsaion.entity.AwardProof;
import com.etsaion.enums.AuditAction;
import com.etsaion.vo.ai.AwardProofVO;

public interface AwardProofService extends IService<AwardProof> {
    AwardProofVO recognizeCertificate(Long studentId, CertificateRecognizeDTO dto);
    AwardProofVO submitAwardProof(Long submitterId, AwardProofSubmitDTO dto);
    Page<AwardProofVO> listMyAwardProofs(Long studentId, int current, int size);
    Page<AwardProofVO> listAuditAwardProofs(Long reviewerId, String role, int current, int size, String status);
    AwardProofVO getAwardProofDetail(Long id, Long userId, String role);
    void reviewAwardProof(Long reviewerId, String role, AwardProofReviewDTO dto);

    /**
     * 审核获奖证明。供统一工作台分发使用。
     *
     * @param reviewNote 审核意见纯文本，不含任何状态标记
     */
    void reviewAwardProof(Long reviewerId, String role, Long proofId, AuditAction action, String reviewNote);
}
