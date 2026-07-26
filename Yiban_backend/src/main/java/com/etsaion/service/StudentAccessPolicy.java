package com.etsaion.service;

import com.etsaion.entity.User;

import java.util.List;

/**
 * 学生数据访问范围的唯一裁决方。
 *
 * 此前这条规则有三套实现且行为互相矛盾：
 * {@code TeacherServiceImpl.canAccessStudent} 对没有学院的教师拒绝，
 * {@code GrowthController} 里逐字复制四遍的判断对同一个教师放行（越权），
 * {@code AssistantToolRegistry.sameCollege} 又按别名模糊匹配——
 * 于是 AI 助手能查到的学生，教师列表里可能查不到。
 *
 * 现在规则只有一条：管理员不限；教师限本学院（含学院更名产生的别名）；
 * 教师未设置学院则拒绝，因为无法判定范围；学生只能看自己。
 */
public interface StudentAccessPolicy {

    /** 当前用户是否是范围受限的教师。 */
    boolean isCollegeScoped();

    /**
     * 当前用户可见的学院。
     *
     * @return null 表示不限（管理员）；否则为该学院名
     * @throws com.etsaion.exception.BusinessException 教师未设置学院时抛 403
     */
    String requireScopedCollege();

    /**
     * 把调用方请求的学院收敛到其可见范围内。
     *
     * @return 实际生效的学院，null 表示不限
     * @throws com.etsaion.exception.BusinessException 越出可见范围时抛 403
     */
    String resolveRequestedCollege(String requestedCollege);

    /** 当前用户能否访问该学生的数据。 */
    boolean canAccess(User student);

    /** 同上，不能访问则抛 403。 */
    void requireAccess(Long studentId);

    /** 当前可见范围内的全部学生 ID；不限范围时返回 null。 */
    List<Long> scopedStudentIds();

    /** 两个学院名是否指同一个学院（容忍更名别名）。 */
    boolean sameCollege(String left, String right);

    /**
     * 学院名的全部写法，用于按学院查询时覆盖更名前后的记录。
     * 无别名时返回它自己。
     */
    List<String> collegeAliases(String college);
}
