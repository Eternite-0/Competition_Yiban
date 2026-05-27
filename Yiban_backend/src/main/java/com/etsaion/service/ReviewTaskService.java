package com.etsaion.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.etsaion.dto.ReviewTaskActionDTO;
import com.etsaion.dto.ReviewTaskBatchActionDTO;
import com.etsaion.entity.ReviewTask;
import com.etsaion.vo.ReviewTaskVO;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public interface ReviewTaskService extends IService<ReviewTask> {
    ReviewTask createPending(String activityType, Long activityId, String targetType, Long targetId,
                             Long submitterId, String title, LocalDateTime deadline, String payloadJson);
    Page<ReviewTaskVO> listTasks(int current, int size, String status, String activityType,
                                 String targetType, String keyword);
    Map<String, Object> getStats();
    void handleTask(Long taskId, Long reviewerId, ReviewTaskActionDTO dto);
    void handleTasks(Long reviewerId, ReviewTaskBatchActionDTO dto);
    void resolveTarget(String targetType, Long targetId, Long reviewerId, String reviewNote);
}
