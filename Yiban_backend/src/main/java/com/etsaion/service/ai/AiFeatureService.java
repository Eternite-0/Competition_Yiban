package com.etsaion.service.ai;

import java.util.Map;

/**
 * AI 赛事智能能力的业务接口。
 *
 * <p>接口返回结构化数据，既供前端智能工作台使用，也供 AI Function Calling
 * 工具复用。所有写入型操作仍然由原有业务接口和用户确认完成。</p>
 */
public interface AiFeatureService {

    Map<String, Object> recommendCompetitions(Long userId);

    Map<String, Object> precheckMaterials(Long userId, Long competitionId, Map<String, Object> payload);

    Map<String, Object> matchTeamMembers(Long userId, Long competitionId, String desiredRole);

    Map<String, Object> teacherCockpit(Long teacherId);

    Map<String, Object> adminAnalytics(Long adminId);
}
