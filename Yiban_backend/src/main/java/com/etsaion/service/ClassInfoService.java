package com.etsaion.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.etsaion.entity.ClassInfo;

import java.util.List;
import java.util.Map;

public interface ClassInfoService extends IService<ClassInfo> {

    /**
     * 获取班级列表（支持按学院、专业、年级筛选）
     */
    List<Map<String, Object>> listClasses(String college, Long majorId, String grade);

    /**
     * 创建班级
     */
    ClassInfo createClass(String name, String college, Long majorId, String grade);

    /**
     * 更新班级
     */
    ClassInfo updateClass(Long id, String name, String college, Long majorId, String grade, String status);

    /**
     * 删除/停用班级
     */
    void deleteClass(Long id);
}
