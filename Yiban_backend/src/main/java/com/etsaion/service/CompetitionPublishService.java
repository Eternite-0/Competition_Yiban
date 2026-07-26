package com.etsaion.service;

import com.etsaion.dto.EventPublishDTO;
import com.etsaion.entity.Competition;

/**
 * 赛事写入的唯一通道。
 *
 * 此前有两条路径往 competition 表写：controller 的发布接口，
 * 以及 AI 草稿确认时直接调 {@code competitionService.save()}。
 * 两条路径的默认值规则并不一致（status 一个 published 一个 draft，
 * level/category/maxTeamSize 只有后者兜底），而且 {@code @Validated}
 * 只作用在 controller 层，AI 路径能写出发布接口写不出的数据。
 */
public interface CompetitionPublishService {

    /**
     * 新建赛事。字段归一化、分类落库、阶段创建都在这里统一完成。
     *
     * @param defaultStatus 调用方未指定 status 时采用的状态
     */
    Competition create(EventPublishDTO dto, String defaultStatus);

    /** 按非空字段更新赛事。 */
    Competition update(Long id, EventPublishDTO dto);
}
