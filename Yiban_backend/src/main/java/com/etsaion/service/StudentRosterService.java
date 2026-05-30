package com.etsaion.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.etsaion.entity.StudentRoster;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

public interface StudentRosterService extends IService<StudentRoster> {

    /**
     * 分页查询花名册
     */
    Page<Map<String, Object>> listRoster(String keyword, String college, Long majorId, String grade, String status, int current, int size);

    /**
     * 根据学号查询（注册前校验）
     */
    Map<String, Object> lookupByStudentNo(String studentNo);

    /**
     * 添加单条花名册记录
     */
    StudentRoster addRecord(String studentNo, String realName, String college, Long majorId, Long classId, String grade);

    /**
     * 批量导入花名册
     */
    Map<String, Object> importRecords(List<Map<String, String>> records);

    /**
     * 更新花名册记录
     */
    StudentRoster updateRecord(Long id, String realName, String college, Long majorId, Long classId, String grade);

    /**
     * 删除花名册记录
     */
    void deleteRecord(Long id);

    /**
     * 获取花名册统计
     */
    Map<String, Object> getStats();

    /**
     * 从 Excel 文件导入花名册
     */
    Map<String, Object> importFromExcel(MultipartFile file);

    /**
     * 根据专业ID获取专业名称
     */
    String getMajorNameById(Long majorId);

    /**
     * 根据班级ID获取班级名称
     */
    String getClassNameById(Long classId);
}
