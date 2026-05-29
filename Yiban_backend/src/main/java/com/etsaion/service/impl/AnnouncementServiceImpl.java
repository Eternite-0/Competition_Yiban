package com.etsaion.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.etsaion.entity.Announcement;
import com.etsaion.entity.Competition;
import com.etsaion.entity.User;
import com.etsaion.exception.BusinessException;
import com.etsaion.mapper.AnnouncementMapper;
import com.etsaion.service.AnnouncementService;
import com.etsaion.service.CompetitionService;
import com.etsaion.service.UserService;
import cn.hutool.core.util.StrUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class AnnouncementServiceImpl extends ServiceImpl<AnnouncementMapper, Announcement> implements AnnouncementService {

    @Autowired
    private UserService userService;

    @Autowired
    private CompetitionService competitionService;

    @Override
    public Page<Map<String, Object>> listAnnouncements(int current, int size, Long competitionId, String type) {
        Page<Announcement> page = new Page<>(current, size);
        LambdaQueryWrapper<Announcement> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Announcement::getStatus, "published");
        if (competitionId != null) {
            wrapper.eq(Announcement::getCompetitionId, competitionId);
        }
        if (StrUtil.isNotBlank(type)) {
            wrapper.eq(Announcement::getType, type);
        }
        wrapper.orderByDesc(Announcement::getIsPinned).orderByDesc(Announcement::getCreateTime);

        Page<Announcement> raw = this.page(page, wrapper);
        Page<Map<String, Object>> voPage = new Page<>(raw.getCurrent(), raw.getSize(), raw.getTotal());
        voPage.setRecords(toVOList(raw.getRecords()));
        return voPage;
    }

    @Override
    public Map<String, Object> getAnnouncementDetail(Long id) {
        Announcement announcement = this.getById(id);
        if (announcement == null) {
            throw new BusinessException("公告不存在");
        }
        Map<String, Object> vo = toVO(announcement);
        // Enrich with author and competition names
        if (announcement.getAuthorId() != null) {
            User author = userService.getById(announcement.getAuthorId());
            if (author != null) vo.put("authorName", author.getRealName());
        }
        if (announcement.getCompetitionId() != null) {
            Competition comp = competitionService.getById(announcement.getCompetitionId());
            if (comp != null) vo.put("competitionName", comp.getName());
        }
        return vo;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Announcement createAnnouncement(Announcement announcement, Long authorId) {
        announcement.setAuthorId(authorId);
        if (announcement.getStatus() == null) {
            announcement.setStatus("published");
        }
        if (announcement.getIsPinned() == null) {
            announcement.setIsPinned(0);
        }
        if (announcement.getType() == null) {
            announcement.setType("system");
        }
        announcement.setCreateTime(LocalDateTime.now());
        announcement.setUpdateTime(LocalDateTime.now());
        this.save(announcement);
        return announcement;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Announcement updateAnnouncement(Long id, Announcement announcement) {
        Announcement existing = this.getById(id);
        if (existing == null) {
            throw new BusinessException("公告不存在");
        }
        if (announcement.getTitle() != null) existing.setTitle(announcement.getTitle());
        if (announcement.getContent() != null) existing.setContent(announcement.getContent());
        if (announcement.getCompetitionId() != null) existing.setCompetitionId(announcement.getCompetitionId());
        if (announcement.getStageId() != null) existing.setStageId(announcement.getStageId());
        if (announcement.getType() != null) existing.setType(announcement.getType());
        if (announcement.getIsPinned() != null) existing.setIsPinned(announcement.getIsPinned());
        if (announcement.getStatus() != null) existing.setStatus(announcement.getStatus());
        existing.setUpdateTime(LocalDateTime.now());
        this.updateById(existing);
        return existing;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteAnnouncement(Long id) {
        Announcement announcement = this.getById(id);
        if (announcement == null) {
            throw new BusinessException("公告不存在");
        }
        this.removeById(id);
    }

    private List<Map<String, Object>> toVOList(List<Announcement> announcements) {
        if (announcements.isEmpty()) return new ArrayList<>();

        List<Long> authorIds = announcements.stream().map(Announcement::getAuthorId)
                .filter(Objects::nonNull).distinct().collect(java.util.stream.Collectors.toList());
        Map<Long, User> authorMap = authorIds.isEmpty() ? Collections.emptyMap()
                : userService.listByIds(authorIds).stream()
                .collect(java.util.stream.Collectors.toMap(User::getId, u -> u, (a, b) -> a));

        List<Long> compIds = announcements.stream().map(Announcement::getCompetitionId)
                .filter(Objects::nonNull).distinct().collect(java.util.stream.Collectors.toList());
        Map<Long, Competition> compMap = compIds.isEmpty() ? Collections.emptyMap()
                : competitionService.listByIds(compIds).stream()
                .collect(java.util.stream.Collectors.toMap(Competition::getId, c -> c, (a, b) -> a));

        List<Map<String, Object>> result = new ArrayList<>();
        for (Announcement a : announcements) {
            Map<String, Object> vo = toVO(a);
            User author = authorMap.get(a.getAuthorId());
            if (author != null) vo.put("authorName", author.getRealName());
            Competition comp = compMap.get(a.getCompetitionId());
            if (comp != null) vo.put("competitionName", comp.getName());
            result.add(vo);
        }
        return result;
    }

    private Map<String, Object> toVO(Announcement a) {
        Map<String, Object> vo = new HashMap<>();
        vo.put("id", a.getId());
        vo.put("competitionId", a.getCompetitionId());
        vo.put("stageId", a.getStageId());
        vo.put("title", a.getTitle());
        vo.put("content", a.getContent());
        vo.put("authorId", a.getAuthorId());
        vo.put("type", a.getType());
        vo.put("isPinned", a.getIsPinned() != null && a.getIsPinned() == 1);
        vo.put("status", a.getStatus());
        vo.put("createTime", a.getCreateTime());
        return vo;
    }
}
