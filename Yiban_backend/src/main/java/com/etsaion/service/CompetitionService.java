package com.etsaion.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.etsaion.entity.Competition;
import com.etsaion.vo.CompetitionVO;

public interface CompetitionService extends IService<Competition> {
    Page<Competition> getCompetitionsPage(int current, int size, String keyword, String level, String category, String status);

    CompetitionVO toVO(Competition c);
    Page<CompetitionVO> toVOPage(Page<Competition> page);
}
