package com.etsaion.service.impl;

import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.etsaion.entity.Competition;
import com.etsaion.mapper.CompetitionMapper;
import com.etsaion.service.CompetitionService;
import com.etsaion.vo.CompetitionVO;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.stream.Collectors;

@Service
public class CompetitionServiceImpl extends ServiceImpl<CompetitionMapper, Competition> implements CompetitionService {

    @Override
    public Page<Competition> getCompetitionsPage(int current, int size, String keyword, String level, String category, String status) {
        Page<Competition> page = new Page<>(current, size);
        LambdaQueryWrapper<Competition> wrapper = new LambdaQueryWrapper<>();

        wrapper.like(StrUtil.isNotBlank(keyword), Competition::getName, keyword)
               .eq(StrUtil.isNotBlank(level), Competition::getLevel, level)
               .eq(StrUtil.isNotBlank(category), Competition::getCategory, category)
               .eq(StrUtil.isNotBlank(status), Competition::getStatus, status)
               .orderByDesc(Competition::getCreateTime);

        return this.page(page, wrapper);
    }

    @Override
    public CompetitionVO toVO(Competition c) {
        if (c == null) return null;
        CompetitionVO vo = new CompetitionVO();
        BeanUtils.copyProperties(c, vo);
        String tags = c.getTags();
        if (StrUtil.isNotBlank(tags) && JSONUtil.isTypeJSON(tags)) {
            vo.setTags(JSONUtil.toList(tags, String.class));
        } else {
            vo.setTags(new ArrayList<>());
        }
        String tracks = c.getTracks();
        if (StrUtil.isNotBlank(tracks) && JSONUtil.isTypeJSON(tracks)) {
            vo.setTracks(JSONUtil.toList(tracks, String.class));
        } else {
            vo.setTracks(new ArrayList<>());
        }
        return vo;
    }

    @Override
    public Page<CompetitionVO> toVOPage(Page<Competition> page) {
        Page<CompetitionVO> voPage = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        voPage.setRecords(page.getRecords().stream().map(this::toVO).collect(Collectors.toList()));
        return voPage;
    }
}
