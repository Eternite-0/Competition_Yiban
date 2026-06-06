package com.etsaion.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.etsaion.config.AiProperties;
import com.etsaion.entity.AiTask;
import com.etsaion.exception.BusinessException;
import com.etsaion.mapper.AiTaskMapper;
import com.etsaion.service.ai.AiTaskService;
import com.etsaion.vo.ai.AiTaskVO;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.stream.Collectors;

@Service
public class AiTaskServiceImpl extends ServiceImpl<AiTaskMapper, AiTask> implements AiTaskService {

    @Autowired
    private AiProperties aiProperties;

    @Override
    @Transactional
    public AiTask createTask(String taskType, String sourceType, String sourceUrl, String sourceHash,
                             Long requesterId, String requesterRole, String promptVersion) {
        AiTask task = new AiTask();
        task.setTaskType(taskType);
        task.setStatus("pending");
        task.setSourceType(sourceType);
        task.setSourceUrl(sourceUrl);
        task.setSourceHash(sourceHash);
        task.setRequesterId(requesterId);
        task.setRequesterRole(requesterRole);
        task.setPromptVersion(promptVersion);
        task.setModelName(aiProperties.getModel());
        task.setCreateTime(LocalDateTime.now());
        task.setUpdateTime(LocalDateTime.now());
        this.save(task);
        return task;
    }

    @Override
    @Transactional
    public void markRunning(Long id) {
        AiTask task = requireTask(id);
        task.setStatus("running");
        task.setStartTime(LocalDateTime.now());
        task.setUpdateTime(LocalDateTime.now());
        this.updateById(task);
    }

    @Override
    @Transactional
    public void markSucceeded(Long id, String rawResultJson, String resultJson, BigDecimal confidence) {
        AiTask task = requireTask(id);
        task.setStatus("succeeded");
        task.setRawResultJson(rawResultJson);
        task.setResultJson(resultJson);
        task.setConfidence(confidence);
        task.setErrorMessage(null);
        task.setFinishTime(LocalDateTime.now());
        task.setUpdateTime(LocalDateTime.now());
        this.updateById(task);
    }

    @Override
    @Transactional
    public void markFailed(Long id, String errorMessage) {
        AiTask task = requireTask(id);
        task.setStatus("failed");
        task.setErrorMessage(StrUtil.maxLength(StrUtil.blankToDefault(errorMessage, "AI 任务执行失败"), 1000));
        task.setFinishTime(LocalDateTime.now());
        task.setUpdateTime(LocalDateTime.now());
        this.updateById(task);
    }

    @Override
    public AiTaskVO getVisibleTask(Long id, Long userId, String role) {
        AiTask task = requireTask(id);
        if (!"admin".equalsIgnoreCase(role) && (userId == null || !userId.equals(task.getRequesterId()))) {
            throw new BusinessException(403, "无权查看该 AI 任务");
        }
        return toVO(task);
    }

    @Override
    public Page<AiTaskVO> listAdminTasks(int current, int size, String taskType, String status) {
        Page<AiTask> page = this.page(new Page<>(current, size), new LambdaQueryWrapper<AiTask>()
                .eq(StrUtil.isNotBlank(taskType), AiTask::getTaskType, taskType)
                .eq(StrUtil.isNotBlank(status), AiTask::getStatus, status)
                .orderByDesc(AiTask::getCreateTime));
        Page<AiTaskVO> voPage = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        voPage.setRecords(page.getRecords().stream().map(this::toVO).collect(Collectors.toList()));
        return voPage;
    }

    @Override
    @Transactional
    public AiTaskVO retryFailedTask(Long id) {
        AiTask task = requireTask(id);
        if (!"failed".equalsIgnoreCase(task.getStatus())) {
            throw new BusinessException("只有失败任务可以重试");
        }
        task.setStatus("pending");
        task.setErrorMessage(null);
        task.setStartTime(null);
        task.setFinishTime(null);
        task.setUpdateTime(LocalDateTime.now());
        this.updateById(task);
        return toVO(task);
    }

    private AiTask requireTask(Long id) {
        AiTask task = this.getById(id);
        if (task == null) {
            throw new BusinessException("AI 任务不存在");
        }
        return task;
    }

    private AiTaskVO toVO(AiTask task) {
        AiTaskVO vo = new AiTaskVO();
        BeanUtils.copyProperties(task, vo);
        return vo;
    }
}
