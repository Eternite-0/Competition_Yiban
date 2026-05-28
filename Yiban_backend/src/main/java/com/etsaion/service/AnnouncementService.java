package com.etsaion.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.etsaion.entity.Announcement;

import java.util.Map;

public interface AnnouncementService extends IService<Announcement> {
    Page<Map<String, Object>> listAnnouncements(int current, int size, Long competitionId, String type);
    Map<String, Object> getAnnouncementDetail(Long id);
    Announcement createAnnouncement(Announcement announcement, Long authorId);
    Announcement updateAnnouncement(Long id, Announcement announcement);
    void deleteAnnouncement(Long id);
}
