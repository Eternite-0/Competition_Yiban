package com.etsaion.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.etsaion.dto.ai.CompetitionSourceSaveDTO;
import com.etsaion.entity.CompetitionSource;
import com.etsaion.vo.ai.CompetitionSourceVO;

import java.util.Map;

public interface CompetitionSourceService extends IService<CompetitionSource> {
    Page<CompetitionSourceVO> listSources(int current, int size, String keyword, Boolean enabled);
    CompetitionSourceVO saveSource(Long id, CompetitionSourceSaveDTO dto);
    void deleteSource(Long id);
    CompetitionSourceVO crawlSource(Long id);
    Map<String, Object> crawlEnabledSources();
}
