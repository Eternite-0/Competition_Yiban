package com.etsaion.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.etsaion.dto.ai.AwardProofReviewDTO;
import com.etsaion.dto.ai.AwardProofSubmitDTO;
import com.etsaion.dto.ai.CertificateRecognizeDTO;
import com.etsaion.entity.AwardProof;
import com.etsaion.vo.ai.AwardProofVO;

public interface AwardProofService extends IService<AwardProof> {
    AwardProofVO recognizeCertificate(Long studentId, CertificateRecognizeDTO dto);
    AwardProofVO submitAwardProof(Long submitterId, AwardProofSubmitDTO dto);
    Page<AwardProofVO> listMyAwardProofs(Long studentId, int current, int size);
    Page<AwardProofVO> listAuditAwardProofs(Long reviewerId, String role, int current, int size, String status);
    AwardProofVO getAwardProofDetail(Long id, Long userId, String role);
    void reviewAwardProof(Long reviewerId, String role, AwardProofReviewDTO dto);
}
