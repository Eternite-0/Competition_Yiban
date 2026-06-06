package com.etsaion.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.etsaion.dto.ai.CompetitionSourceSaveDTO;
import com.etsaion.entity.CompetitionSource;
import com.etsaion.exception.BusinessException;
import com.etsaion.mapper.CompetitionSourceMapper;
import com.etsaion.service.CompetitionSourceService;
import com.etsaion.service.ai.CrawlerService;
import com.etsaion.vo.ai.CompetitionSourceVO;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.stream.Collectors;

@Service
public class CompetitionSourceServiceImpl extends ServiceImpl<CompetitionSourceMapper, CompetitionSource>
        implements CompetitionSourceService {

    @Autowired
    private CrawlerService crawlerService;

    @Override
    public Page<CompetitionSourceVO> listSources(int current, int size, String keyword, Boolean enabled) {
        Page<CompetitionSource> page = this.page(new Page<>(current, size), new LambdaQueryWrapper<CompetitionSource>()
                .like(StrUtil.isNotBlank(keyword), CompetitionSource::getName, keyword)
                .eq(enabled != null, CompetitionSource::getEnabled, Boolean.TRUE.equals(enabled) ? 1 : 0)
                .orderByDesc(CompetitionSource::getUpdateTime)
                .orderByDesc(CompetitionSource::getCreateTime));
        Page<CompetitionSourceVO> voPage = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        voPage.setRecords(page.getRecords().stream().map(this::toVO).collect(Collectors.toList()));
        return voPage;
    }

    @Override
    @Transactional
    public CompetitionSourceVO saveSource(Long id, CompetitionSourceSaveDTO dto) {
        CompetitionSource source = id == null ? new CompetitionSource() : this.getById(id);
        if (source == null) {
            throw new BusinessException("赛事来源不存在");
        }
        source.setName(dto.getName());
        source.setUrl(dto.getUrl());
        source.setSourceType(StrUtil.blankToDefault(dto.getSourceType(), "custom"));
        source.setCrawlFrequency(StrUtil.blankToDefault(dto.getCrawlFrequency(), "manual"));
        source.setEnabled(Boolean.FALSE.equals(dto.getEnabled()) ? 0 : 1);
        source.setUpdateTime(LocalDateTime.now());
        if (id == null) {
            source.setCreateTime(LocalDateTime.now());
            this.save(source);
        } else {
            this.updateById(source);
        }
        return toVO(source);
    }

    @Override
    @Transactional
    public void deleteSource(Long id) {
        if (!this.removeById(id)) {
            throw new BusinessException("赛事来源不存在");
        }
    }

    @Override
    @Transactional
    public CompetitionSourceVO crawlSource(Long id) {
        CompetitionSource source = this.getById(id);
        if (source == null) {
            throw new BusinessException("赛事来源不存在");
        }
        try {
            int created = crawlerService.crawlSource(source);
            source.setLastCrawlStatus("succeeded");
            source.setLastErrorMessage(null);
            source.setLastCrawlTime(LocalDateTime.now());
            source.setUpdateTime(LocalDateTime.now());
            this.updateById(source);
            CompetitionSourceVO vo = toVO(source);
            vo.setLastCrawlStatus("succeeded:" + created);
            return vo;
        } catch (RuntimeException e) {
            source.setLastCrawlStatus("failed");
            source.setLastErrorMessage(StrUtil.maxLength(e.getMessage(), 1000));
            source.setLastCrawlTime(LocalDateTime.now());
            source.setUpdateTime(LocalDateTime.now());
            this.updateById(source);
            throw e;
        }
    }

    private CompetitionSourceVO toVO(CompetitionSource source) {
        CompetitionSourceVO vo = new CompetitionSourceVO();
        BeanUtils.copyProperties(source, vo);
        vo.setEnabled(source.getEnabled() == null || source.getEnabled() == 1);
        return vo;
    }
}
