package com.etsaion.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.etsaion.dto.ActivitySaveDTO;
import com.etsaion.dto.ParticipationCreateDTO;
import com.etsaion.entity.Activity;
import com.etsaion.entity.Participation;
import com.etsaion.vo.ActivityVO;
import com.etsaion.vo.ParticipationVO;

import java.util.List;

public interface ActivityService extends IService<Activity> {
    Page<ActivityVO> listActivities(int current, int size, String type, String status, String keyword, boolean includePrivate);
    ActivityVO getActivityDetail(Long id, boolean includePrivate);
    ActivityVO saveActivity(Long id, ActivitySaveDTO dto);
    Participation createParticipation(Long studentId, Long activityId, ParticipationCreateDTO dto);
    List<ParticipationVO> listMyParticipations(Long studentId);
    ActivityVO toVO(Activity activity);
}
