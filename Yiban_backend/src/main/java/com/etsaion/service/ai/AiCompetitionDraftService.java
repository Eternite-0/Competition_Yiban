package com.etsaion.service.ai;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.etsaion.dto.ai.CompetitionDraftConfirmDTO;
import com.etsaion.dto.ai.CompetitionDraftParseUrlDTO;
import com.etsaion.entity.AiCompetitionDraft;
import com.etsaion.vo.ai.AiCompetitionParseResultVO;
import com.etsaion.vo.ai.AiCompetitionDraftVO;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.function.Consumer;

public interface AiCompetitionDraftService extends IService<AiCompetitionDraft> {
    AiCompetitionDraftVO parseFile(Long adminId, MultipartFile file);
    AiCompetitionParseResultVO parseFileBatch(Long adminId, MultipartFile file);
    AiCompetitionDraftVO parseUrl(Long adminId, CompetitionDraftParseUrlDTO dto);
    AiCompetitionParseResultVO parseUrlBatch(Long adminId, CompetitionDraftParseUrlDTO dto);
    AiCompetitionParseResultVO parseUrlBatch(Long adminId, CompetitionDraftParseUrlDTO dto, String sourceType);
    AiCompetitionDraftVO parseUrlWithProgress(Long adminId, CompetitionDraftParseUrlDTO dto,
                                              Consumer<Map<String, String>> onProgress);
    AiCompetitionParseResultVO parseUrlBatchWithProgress(Long adminId, CompetitionDraftParseUrlDTO dto,
                                                         Consumer<Map<String, String>> onProgress);
    Page<AiCompetitionDraftVO> listDrafts(int current, int size, String status, String keyword);
    AiCompetitionDraftVO getDraftDetail(Long id);
    AiCompetitionDraftVO updateDraft(Long id, AiCompetitionDraftVO dto);
    AiCompetitionDraftVO confirmDraft(Long id, Long adminId, CompetitionDraftConfirmDTO dto);
    AiCompetitionDraftVO ignoreDraft(Long id, Long adminId, CompetitionDraftConfirmDTO dto);
}
