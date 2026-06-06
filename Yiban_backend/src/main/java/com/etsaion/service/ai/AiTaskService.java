package com.etsaion.service.ai;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.etsaion.entity.AiTask;
import com.etsaion.vo.ai.AiTaskVO;

import java.math.BigDecimal;

public interface AiTaskService extends IService<AiTask> {
    AiTask createTask(String taskType, String sourceType, String sourceUrl, String sourceHash,
                      Long requesterId, String requesterRole, String promptVersion);
    void markRunning(Long id);
    void markSucceeded(Long id, String rawResultJson, String resultJson, BigDecimal confidence);
    void markFailed(Long id, String errorMessage);
    AiTaskVO getVisibleTask(Long id, Long userId, String role);
    Page<AiTaskVO> listAdminTasks(int current, int size, String taskType, String status);
    AiTaskVO retryFailedTask(Long id);
}
