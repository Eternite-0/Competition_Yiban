package com.etsaion.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.etsaion.entity.Major;

import java.util.List;
import java.util.Map;

public interface MajorService extends IService<Major> {

    /**
     * 获取专业列表（支持按学院筛选）
     */
    List<Map<String, Object>> listMajors(String college);

    /**
     * 创建专业
     */
    Major createMajor(String name, String college);

    /**
     * 更新专业
     */
    Major updateMajor(Long id, String name, String college, String status);

    /**
     * 删除/停用专业
     */
    void deleteMajor(Long id);
}
