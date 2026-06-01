package com.etsaion.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.etsaion.entity.Major;
import com.etsaion.exception.BusinessException;
import com.etsaion.mapper.MajorMapper;
import com.etsaion.service.MajorService;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class MajorServiceImpl extends ServiceImpl<MajorMapper, Major> implements MajorService {

    @Override
    public List<String> listColleges() {
        LambdaQueryWrapper<Major> wrapper = new LambdaQueryWrapper<>();
        wrapper.select(Major::getCollege)
               .eq(Major::getStatus, "active")
               .groupBy(Major::getCollege)
               .orderByAsc(Major::getCollege);
        List<Major> majors = this.list(wrapper);
        return majors.stream()
                .map(Major::getCollege)
                .filter(c -> c != null && !c.isEmpty())
                .distinct()
                .collect(java.util.stream.Collectors.toList());
    }

    @Override
    public List<Map<String, Object>> listMajors(String college) {
        LambdaQueryWrapper<Major> wrapper = new LambdaQueryWrapper<>();
        if (college != null && !college.isEmpty()) {
            wrapper.eq(Major::getCollege, college);
        }
        wrapper.orderByDesc(Major::getCreateTime);

        List<Major> majors = this.list(wrapper);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Major major : majors) {
            result.add(toMap(major));
        }
        return result;
    }

    @Override
    public Major createMajor(String name, String college) {
        if (name == null || name.trim().isEmpty()) {
            throw new BusinessException("专业名称不能为空");
        }
        if (college == null || college.trim().isEmpty()) {
            throw new BusinessException("所属学院不能为空");
        }

        // 检查是否重复
        long count = this.count(new LambdaQueryWrapper<Major>()
                .eq(Major::getName, name.trim())
                .eq(Major::getCollege, college.trim()));
        if (count > 0) {
            throw new BusinessException("该学院下已存在同名专业");
        }

        Major major = new Major();
        major.setName(name.trim());
        major.setCollege(college.trim());
        major.setStatus("active");
        major.setCreateTime(LocalDateTime.now());
        major.setUpdateTime(LocalDateTime.now());
        this.save(major);
        return major;
    }

    @Override
    public Major updateMajor(Long id, String name, String college, String status) {
        Major major = this.getById(id);
        if (major == null) {
            throw new BusinessException("专业不存在");
        }

        if (name != null && !name.trim().isEmpty()) {
            major.setName(name.trim());
        }
        if (college != null && !college.trim().isEmpty()) {
            major.setCollege(college.trim());
        }
        if (status != null) {
            major.setStatus(status);
        }
        major.setUpdateTime(LocalDateTime.now());
        this.updateById(major);
        return major;
    }

    @Override
    public void deleteMajor(Long id) {
        Major major = this.getById(id);
        if (major == null) {
            throw new BusinessException("专业不存在");
        }
        this.removeById(id);
    }

    private Map<String, Object> toMap(Major major) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", major.getId());
        m.put("name", major.getName());
        m.put("college", major.getCollege());
        m.put("status", major.getStatus());
        m.put("createTime", major.getCreateTime());
        m.put("updateTime", major.getUpdateTime());
        return m;
    }
}
