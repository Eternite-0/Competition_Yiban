package com.etsaion.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.etsaion.entity.ClassInfo;
import com.etsaion.entity.Major;
import com.etsaion.exception.BusinessException;
import com.etsaion.mapper.ClassInfoMapper;
import com.etsaion.service.ClassInfoService;
import com.etsaion.service.MajorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ClassInfoServiceImpl extends ServiceImpl<ClassInfoMapper, ClassInfo> implements ClassInfoService {

    @Autowired
    private MajorService majorService;

    @Override
    public List<Map<String, Object>> listClasses(String college, Long majorId, String grade) {
        LambdaQueryWrapper<ClassInfo> wrapper = new LambdaQueryWrapper<>();
        if (college != null && !college.isEmpty()) {
            wrapper.eq(ClassInfo::getCollege, college);
        }
        if (majorId != null) {
            wrapper.eq(ClassInfo::getMajorId, majorId);
        }
        if (grade != null && !grade.isEmpty()) {
            wrapper.eq(ClassInfo::getGrade, grade);
        }
        wrapper.orderByDesc(ClassInfo::getCreateTime);

        List<ClassInfo> classes = this.list(wrapper);
        List<Map<String, Object>> result = new ArrayList<>();
        for (ClassInfo cls : classes) {
            result.add(toMap(cls));
        }
        return result;
    }

    @Override
    public ClassInfo createClass(String name, String college, Long majorId, String grade) {
        if (name == null || name.trim().isEmpty()) {
            throw new BusinessException("班级名称不能为空");
        }
        if (college == null || college.trim().isEmpty()) {
            throw new BusinessException("所属学院不能为空");
        }
        if (majorId == null) {
            throw new BusinessException("所属专业不能为空");
        }
        if (grade == null || grade.trim().isEmpty()) {
            throw new BusinessException("年级不能为空");
        }

        // 校验专业是否存在
        Major major = majorService.getById(majorId);
        if (major == null) {
            throw new BusinessException("所选专业不存在");
        }

        // 检查是否重复
        long count = this.count(new LambdaQueryWrapper<ClassInfo>()
                .eq(ClassInfo::getName, name.trim())
                .eq(ClassInfo::getMajorId, majorId)
                .eq(ClassInfo::getGrade, grade.trim()));
        if (count > 0) {
            throw new BusinessException("该专业和年级下已存在同名班级");
        }

        ClassInfo classInfo = new ClassInfo();
        classInfo.setName(name.trim());
        classInfo.setCollege(college.trim());
        classInfo.setMajorId(majorId);
        classInfo.setGrade(grade.trim());
        classInfo.setStatus("active");
        classInfo.setCreateTime(LocalDateTime.now());
        classInfo.setUpdateTime(LocalDateTime.now());
        this.save(classInfo);
        return classInfo;
    }

    @Override
    public ClassInfo updateClass(Long id, String name, String college, Long majorId, String grade, String status) {
        ClassInfo classInfo = this.getById(id);
        if (classInfo == null) {
            throw new BusinessException("班级不存在");
        }

        if (name != null && !name.trim().isEmpty()) {
            classInfo.setName(name.trim());
        }
        if (college != null && !college.trim().isEmpty()) {
            classInfo.setCollege(college.trim());
        }
        if (majorId != null) {
            Major major = majorService.getById(majorId);
            if (major == null) {
                throw new BusinessException("所选专业不存在");
            }
            classInfo.setMajorId(majorId);
        }
        if (grade != null && !grade.trim().isEmpty()) {
            classInfo.setGrade(grade.trim());
        }
        if (status != null) {
            classInfo.setStatus(status);
        }
        classInfo.setUpdateTime(LocalDateTime.now());
        this.updateById(classInfo);
        return classInfo;
    }

    @Override
    public void deleteClass(Long id) {
        ClassInfo classInfo = this.getById(id);
        if (classInfo == null) {
            throw new BusinessException("班级不存在");
        }
        this.removeById(id);
    }

    private Map<String, Object> toMap(ClassInfo cls) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", cls.getId());
        m.put("name", cls.getName());
        m.put("college", cls.getCollege());
        m.put("majorId", cls.getMajorId());
        m.put("grade", cls.getGrade());
        m.put("status", cls.getStatus());
        m.put("createTime", cls.getCreateTime());
        m.put("updateTime", cls.getUpdateTime());

        // 查询专业名称
        if (cls.getMajorId() != null) {
            Major major = majorService.getById(cls.getMajorId());
            if (major != null) {
                m.put("majorName", major.getName());
            }
        }
        return m;
    }
}
