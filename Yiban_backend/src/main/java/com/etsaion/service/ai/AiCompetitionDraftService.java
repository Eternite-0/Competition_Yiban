package com.etsaion.service.ai;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.etsaion.dto.ai.CompetitionDraftConfirmDTO;
import com.etsaion.dto.ai.CompetitionDraftParseUrlDTO;
import com.etsaion.entity.AiCompetitionDraft;
import com.etsaion.vo.ai.AiCompetitionDraftVO;
import org.springframework.web.multipart.MultipartFile;

public interface AiCompetitionDraftService extends IService<AiCompetitionDraft> {
    AiCompetitionDraftVO parseFile(Long adminId, MultipartFile file);
    AiCompetitionDraftVO parseUrl(Long adminId, CompetitionDraftParseUrlDTO dto);
    Page<AiCompetitionDraftVO> listDrafts(int current, int size, String status, String keyword);
    AiCompetitionDraftVO getDraftDetail(Long id);
    AiCompetitionDraftVO updateDraft(Long id, AiCompetitionDraftVO dto);
    AiCompetitionDraftVO confirmDraft(Long id, Long adminId, CompetitionDraftConfirmDTO dto);
    AiCompetitionDraftVO ignoreDraft(Long id, Long adminId, CompetitionDraftConfirmDTO dto);
}
