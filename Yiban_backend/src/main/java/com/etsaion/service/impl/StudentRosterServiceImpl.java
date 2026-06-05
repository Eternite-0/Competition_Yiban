package com.etsaion.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.etsaion.entity.ClassInfo;
import com.etsaion.entity.Major;
import com.etsaion.entity.StudentRoster;
import com.etsaion.exception.BusinessException;
import com.etsaion.mapper.StudentRosterMapper;
import com.etsaion.service.ClassInfoService;
import com.etsaion.service.MajorService;
import com.etsaion.service.StudentRosterService;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.usermodel.FormulaEvaluator;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
public class StudentRosterServiceImpl extends ServiceImpl<StudentRosterMapper, StudentRoster> implements StudentRosterService {

    @Autowired
    private MajorService majorService;

    @Autowired
    private ClassInfoService classInfoService;

    @Override
    public Page<Map<String, Object>> listRoster(String keyword, String college, Long majorId, String grade, String status, int current, int size) {
        Page<StudentRoster> page = new Page<>(current, size);
        LambdaQueryWrapper<StudentRoster> wrapper = new LambdaQueryWrapper<>();

        if (keyword != null && !keyword.isEmpty()) {
            wrapper.and(w -> w
                    .like(StudentRoster::getStudentNo, keyword)
                    .or()
                    .like(StudentRoster::getRealName, keyword));
        }
        if (college != null && !college.isEmpty()) {
            wrapper.eq(StudentRoster::getCollege, college);
        }
        if (majorId != null) {
            wrapper.eq(StudentRoster::getMajorId, majorId);
        }
        if (grade != null && !grade.isEmpty()) {
            wrapper.eq(StudentRoster::getGrade, grade);
        }
        if (status != null && !status.isEmpty()) {
            wrapper.eq(StudentRoster::getStatus, status);
        }
        wrapper.orderByDesc(StudentRoster::getCreateTime);

        Page<StudentRoster> resultPage = this.page(page, wrapper);

        Page<Map<String, Object>> voPage = new Page<>(current, size, resultPage.getTotal());
        List<Map<String, Object>> voList = new ArrayList<>();
        for (StudentRoster roster : resultPage.getRecords()) {
            voList.add(toMap(roster));
        }
        voPage.setRecords(voList);
        return voPage;
    }

    @Override
    public boolean existsByStudentNo(String studentNo) {
        if (studentNo == null || studentNo.isBlank()) return false;
        return this.count(new LambdaQueryWrapper<StudentRoster>()
                .eq(StudentRoster::getStudentNo, studentNo.trim())
                .ne(StudentRoster::getStatus, "registered")) > 0;
    }

    @Override
    public Map<String, Object> lookupStudentStatus(String studentNo) {
        Map<String, Object> result = new HashMap<>();
        if (studentNo == null || studentNo.isBlank()) {
            result.put("found", false);
            result.put("message", "请输入学号");
            return result;
        }

        StudentRoster roster = this.getOne(new LambdaQueryWrapper<StudentRoster>()
                .eq(StudentRoster::getStudentNo, studentNo.trim()));

        if (roster == null) {
            result.put("found", false);
            result.put("message", "未找到该学号，请确认学号是否正确");
            return result;
        }

        if ("registered".equals(roster.getStatus())) {
            result.put("found", false);
            result.put("registered", true);
            result.put("message", "该学号已注册，请直接登录");
            return result;
        }

        result.put("found", true);
        Map<String, Object> data = new HashMap<>();
        data.put("realName", roster.getRealName());
        data.put("college", roster.getCollege());
        data.put("grade", roster.getGrade());
        // 查询专业名称
        if (roster.getMajorId() != null) {
            Major major = majorService.getById(roster.getMajorId());
            data.put("majorName", major != null ? major.getName() : "");
        }
        // 查询班级名称
        if (roster.getClassId() != null) {
            ClassInfo classInfo = classInfoService.getById(roster.getClassId());
            data.put("className", classInfo != null ? classInfo.getName() : "");
        }
        result.put("data", data);
        return result;
    }

    @Override
    public Map<String, Object> lookupByStudentNo(String studentNo) {
        if (studentNo == null || studentNo.trim().isEmpty()) {
            throw new BusinessException("学号不能为空");
        }

        StudentRoster roster = this.getOne(new LambdaQueryWrapper<StudentRoster>()
                .eq(StudentRoster::getStudentNo, studentNo.trim()));

        if (roster == null) {
            Map<String, Object> result = new HashMap<>();
            result.put("found", false);
            result.put("message", "学号未录入系统，请联系管理员");
            return result;
        }

        if ("registered".equals(roster.getStatus())) {
            Map<String, Object> result = new HashMap<>();
            result.put("found", false);
            result.put("message", "该学号已注册，请直接登录");
            return result;
        }

        Map<String, Object> result = new HashMap<>();
        result.put("found", true);
        result.put("data", toMap(roster));
        return result;
    }

    @Override
    public StudentRoster addRecord(String studentNo, String realName, String college, Long majorId, Long classId, String grade) {
        if (studentNo == null || studentNo.trim().isEmpty()) {
            throw new BusinessException("学号不能为空");
        }
        if (realName == null || realName.trim().isEmpty()) {
            throw new BusinessException("姓名不能为空");
        }
        if (college == null || college.trim().isEmpty()) {
            throw new BusinessException("学院不能为空");
        }

        // 检查学号是否重复
        long count = this.count(new LambdaQueryWrapper<StudentRoster>()
                .eq(StudentRoster::getStudentNo, studentNo.trim()));
        if (count > 0) {
            throw new BusinessException("该学号已存在于花名册中");
        }

        // 校验专业和班级
        if (majorId != null) {
            Major major = majorService.getById(majorId);
            if (major == null) {
                throw new BusinessException("所选专业不存在");
            }
        }
        if (classId != null) {
            ClassInfo classInfo = classInfoService.getById(classId);
            if (classInfo == null) {
                throw new BusinessException("所选班级不存在");
            }
        }

        StudentRoster roster = new StudentRoster();
        roster.setStudentNo(studentNo.trim());
        roster.setRealName(realName.trim());
        roster.setCollege(college.trim());
        roster.setMajorId(majorId);
        roster.setClassId(classId);
        roster.setGrade(grade);
        roster.setStatus("pending");
        roster.setCreateTime(LocalDateTime.now());
        roster.setUpdateTime(LocalDateTime.now());
        this.save(roster);
        return roster;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> importRecords(List<Map<String, String>> records) {
        int success = 0;
        int skipped = 0;
        int failed = 0;
        List<String> errors = new ArrayList<>();

        for (int i = 0; i < records.size(); i++) {
            Map<String, String> record = records.get(i);
            String studentNo = record.get("studentNo");
            String realName = record.get("realName");
            String college = record.get("college");
            String majorName = record.get("major");
            String className = record.get("className");
            String grade = record.get("grade");

            try {
                // 检查学号是否已存在
                long count = this.count(new LambdaQueryWrapper<StudentRoster>()
                        .eq(StudentRoster::getStudentNo, studentNo));
                if (count > 0) {
                    skipped++;
                    continue;
                }

                // 查找或创建专业
                Long majorId = null;
                if (majorName != null && !majorName.isEmpty() && college != null && !college.isEmpty()) {
                    Major major = majorService.getOne(new LambdaQueryWrapper<Major>()
                            .eq(Major::getName, majorName)
                            .eq(Major::getCollege, college));
                    if (major == null) {
                        major = majorService.createMajor(majorName, college);
                    }
                    majorId = major.getId();
                }

                // 查找或创建班级
                Long classId = null;
                if (className != null && !className.isEmpty() && majorId != null && grade != null && !grade.isEmpty()) {
                    ClassInfo classInfo = classInfoService.getOne(new LambdaQueryWrapper<ClassInfo>()
                            .eq(ClassInfo::getName, className)
                            .eq(ClassInfo::getMajorId, majorId)
                            .eq(ClassInfo::getGrade, grade));
                    if (classInfo == null) {
                        classInfo = classInfoService.createClass(className, college, majorId, grade);
                    }
                    classId = classInfo.getId();
                }

                addRecord(studentNo, realName, college, majorId, classId, grade);
                success++;
            } catch (Exception e) {
                failed++;
                errors.add("第" + (i + 1) + "行: " + e.getMessage());
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("success", success);
        result.put("skipped", skipped);
        result.put("failed", failed);
        result.put("errors", errors);
        return result;
    }

    @Override
    public StudentRoster updateRecord(Long id, String realName, String college, Long majorId, Long classId, String grade) {
        StudentRoster roster = this.getById(id);
        if (roster == null) {
            throw new BusinessException("花名册记录不存在");
        }

        if (realName != null && !realName.trim().isEmpty()) {
            roster.setRealName(realName.trim());
        }
        if (college != null && !college.trim().isEmpty()) {
            roster.setCollege(college.trim());
        }
        if (majorId != null) {
            roster.setMajorId(majorId);
        }
        if (classId != null) {
            roster.setClassId(classId);
        }
        if (grade != null && !grade.trim().isEmpty()) {
            roster.setGrade(grade.trim());
        }
        roster.setUpdateTime(LocalDateTime.now());
        this.updateById(roster);
        return roster;
    }

    @Override
    public void deleteRecord(Long id) {
        StudentRoster roster = this.getById(id);
        if (roster == null) {
            throw new BusinessException("花名册记录不存在");
        }
        this.removeById(id);
    }

    @Override
    public Map<String, Object> getStats() {
        long total = this.count();
        long registered = this.count(new LambdaQueryWrapper<StudentRoster>()
                .eq(StudentRoster::getStatus, "registered"));
        long pending = this.count(new LambdaQueryWrapper<StudentRoster>()
                .eq(StudentRoster::getStatus, "pending"));

        Map<String, Object> stats = new HashMap<>();
        stats.put("total", total);
        stats.put("registered", registered);
        stats.put("pending", pending);
        return stats;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> importFromExcel(MultipartFile file) {
        int success = 0;
        int skipped = 0;
        int failed = 0;
        List<String> errors = new ArrayList<>();

        try (InputStream inputStream = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(inputStream)) {

            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rowIterator = sheet.iterator();

            // 跳过表头
            if (rowIterator.hasNext()) {
                rowIterator.next();
            }

            int rowNum = 1;
            while (rowIterator.hasNext()) {
                Row row = rowIterator.next();
                rowNum++;

                try {
                    // 读取单元格：学号、姓名、学院、专业、班级、年级
                    String studentNo = getCellStringValue(row.getCell(0));
                    String realName = getCellStringValue(row.getCell(1));
                    String college = getCellStringValue(row.getCell(2));
                    String majorName = getCellStringValue(row.getCell(3));
                    String className = getCellStringValue(row.getCell(4));
                    String grade = getCellStringValue(row.getCell(5));

                    // 校验必填字段
                    if (studentNo == null || studentNo.isEmpty()) {
                        errors.add("第" + rowNum + "行: 学号为空，已跳过");
                        failed++;
                        continue;
                    }
                    if (realName == null || realName.isEmpty()) {
                        errors.add("第" + rowNum + "行: 姓名为空，已跳过");
                        failed++;
                        continue;
                    }

                    // 检查学号是否已存在
                    long count = this.count(new LambdaQueryWrapper<StudentRoster>()
                            .eq(StudentRoster::getStudentNo, studentNo));
                    if (count > 0) {
                        skipped++;
                        continue;
                    }

                    // 查找或创建专业
                    Long majorId = null;
                    if (majorName != null && !majorName.isEmpty() && college != null && !college.isEmpty()) {
                        Major major = majorService.getOne(new LambdaQueryWrapper<Major>()
                                .eq(Major::getName, majorName)
                                .eq(Major::getCollege, college));
                        if (major == null) {
                            major = majorService.createMajor(majorName, college);
                        }
                        majorId = major.getId();
                    }

                    // 查找或创建班级
                    Long classId = null;
                    if (className != null && !className.isEmpty() && majorId != null && grade != null && !grade.isEmpty()) {
                        ClassInfo classInfo = classInfoService.getOne(new LambdaQueryWrapper<ClassInfo>()
                                .eq(ClassInfo::getName, className)
                                .eq(ClassInfo::getMajorId, majorId)
                                .eq(ClassInfo::getGrade, grade));
                        if (classInfo == null) {
                            classInfo = classInfoService.createClass(className, college, majorId, grade);
                        }
                        classId = classInfo.getId();
                    }

                    // 添加记录
                    addRecord(studentNo, realName, college, majorId, classId, grade);
                    success++;
                } catch (Exception e) {
                    failed++;
                    errors.add("第" + rowNum + "行: " + e.getMessage());
                    log.warn("导入第{}行失败: {}", rowNum, e.getMessage());
                }
            }
        } catch (Exception e) {
            throw new BusinessException("Excel 文件解析失败: " + e.getMessage());
        }

        Map<String, Object> result = new HashMap<>();
        result.put("success", success);
        result.put("skipped", skipped);
        result.put("failed", failed);
        result.put("errors", errors);
        log.info("Excel 导入完成: 成功={}, 跳过={}, 失败={}", success, skipped, failed);
        return result;
    }

    private String getCellStringValue(Cell cell) {
        if (cell == null) {
            return null;
        }
        String value;
        switch (cell.getCellType()) {
            case STRING:
                value = cell.getStringCellValue().trim();
                break;
            case NUMERIC:
                // 处理数字类型（如学号 20240101）
                double numVal = cell.getNumericCellValue();
                if (numVal == Math.floor(numVal) && !Double.isInfinite(numVal)) {
                    value = String.valueOf((long) numVal);
                } else {
                    value = String.valueOf(numVal);
                }
                break;
            case BOOLEAN:
                value = String.valueOf(cell.getBooleanCellValue());
                break;
            case FORMULA:
                // 计算公式的值而不是返回公式本身
                try {
                    FormulaEvaluator evaluator = cell.getSheet().getWorkbook().getCreationHelper().createFormulaEvaluator();
                    CellValue cellValue = evaluator.evaluate(cell);
                    switch (cellValue.getCellType()) {
                        case STRING:
                            value = cellValue.getStringValue();
                            break;
                        case NUMERIC:
                            double num = cellValue.getNumberValue();
                            if (num == Math.floor(num) && !Double.isInfinite(num)) {
                                value = String.valueOf((long) num);
                            } else {
                                value = String.valueOf(num);
                            }
                            break;
                        case BOOLEAN:
                            value = String.valueOf(cellValue.getBooleanValue());
                            break;
                        default:
                            value = cell.getCellFormula();
                    }
                } catch (Exception e) {
                    // 公式计算失败时，尝试直接获取字符串值
                    try {
                        value = cell.getStringCellValue();
                    } catch (Exception e2) {
                        value = cell.getCellFormula();
                    }
                }
                break;
            default:
                value = "";
        }
        return value.isEmpty() ? null : value.trim();
    }

    private Map<String, Object> toMap(StudentRoster roster) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", roster.getId());
        m.put("studentNo", roster.getStudentNo());
        m.put("realName", roster.getRealName());
        m.put("college", roster.getCollege());
        m.put("majorId", roster.getMajorId());
        m.put("classId", roster.getClassId());
        m.put("grade", roster.getGrade());
        m.put("status", roster.getStatus());
        m.put("createTime", roster.getCreateTime());
        m.put("updateTime", roster.getUpdateTime());

        // 查询专业名称
        if (roster.getMajorId() != null) {
            Major major = majorService.getById(roster.getMajorId());
            if (major != null) {
                m.put("majorName", major.getName());
            }
        }

        // 查询班级名称
        if (roster.getClassId() != null) {
            ClassInfo classInfo = classInfoService.getById(roster.getClassId());
            if (classInfo != null) {
                m.put("className", classInfo.getName());
            }
        }

        return m;
    }

    @Override
    public String getMajorNameById(Long majorId) {
        Major major = majorService.getById(majorId);
        return major != null ? major.getName() : null;
    }

    @Override
    public String getClassNameById(Long classId) {
        ClassInfo classInfo = classInfoService.getById(classId);
        return classInfo != null ? classInfo.getName() : null;
    }
}
