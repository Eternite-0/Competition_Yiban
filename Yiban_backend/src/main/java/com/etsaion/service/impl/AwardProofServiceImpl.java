package com.etsaion.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.crypto.SecureUtil;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.etsaion.dto.ai.AwardProofReviewDTO;
import com.etsaion.dto.ai.AwardProofSubmitDTO;
import com.etsaion.dto.ai.CertificateRecognizeDTO;
import com.etsaion.entity.AiTask;
import com.etsaion.entity.AwardProof;
import com.etsaion.entity.AwardProofStudent;
import com.etsaion.entity.Competition;
import com.etsaion.entity.GrowthRecord;
import com.etsaion.entity.Message;
import com.etsaion.entity.User;
import com.etsaion.exception.BusinessException;
import com.etsaion.mapper.AwardProofMapper;
import com.etsaion.service.AwardProofService;
import com.etsaion.service.AwardProofStudentService;
import com.etsaion.service.CompetitionService;
import com.etsaion.service.GrowthRecordService;
import com.etsaion.service.MessageService;
import com.etsaion.service.ReviewTaskService;
import com.etsaion.service.UserService;
import com.etsaion.service.ai.AiJsonSchemaService;
import com.etsaion.service.ai.AiTaskService;
import com.etsaion.service.ai.MimoModelClient;
import com.etsaion.vo.ai.AiModelResponseVO;
import com.etsaion.vo.ai.AwardProofVO;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class AwardProofServiceImpl extends ServiceImpl<AwardProofMapper, AwardProof> implements AwardProofService {

    @Autowired
    private AiTaskService aiTaskService;

    @Autowired
    private MimoModelClient mimoModelClient;

    @Autowired
    private AiJsonSchemaService aiJsonSchemaService;

    @Autowired
    private AwardProofStudentService awardProofStudentService;

    @Autowired
    private UserService userService;

    @Autowired
    private CompetitionService competitionService;

    @Autowired
    private MessageService messageService;

    @Autowired
    private GrowthRecordService growthRecordService;

    @Autowired
    @Lazy
    private ReviewTaskService reviewTaskService;

    @Override
    @Transactional
    public AwardProofVO recognizeCertificate(Long studentId, CertificateRecognizeDTO dto) {
        String fileHash = normalizeFileHash(dto.getFileHash(), dto.getFileUrl());
        AiTask task = aiTaskService.createTask("certificate_recognition", "image", dto.getFileUrl(), fileHash,
                studentId, "student", "certificate_recognition_v1");
        aiTaskService.markRunning(task.getId());

        AiModelResponseVO response = mimoModelClient.chatVisionJson(
                "你是获奖证书多模态结构化识别助手。只抽取证书中明确出现的信息，不确定字段留空。",
                dto.getFileUrl(),
                "请识别比赛名称、获奖等级、获奖时间、主办单位、获奖人、证书编号、印章或落款，并返回严格 JSON。",
                certificateSchemaHint());
        if (!response.isSuccess()) {
            aiTaskService.markFailed(task.getId(), response.getErrorMessage());
            throw new BusinessException(response.getErrorMessage());
        }

        JsonNode result = aiJsonSchemaService.validateCertificateResult(response.getContent());
        BigDecimal confidence = readConfidence(result);
        aiTaskService.markSucceeded(task.getId(), response.getRawResponse(), result.toString(), confidence);

        AwardProofVO vo = fromRecognitionResult(result);
        vo.setAiTaskId(task.getId());
        vo.setFileName(dto.getFileName());
        vo.setFileUrl(dto.getFileUrl());
        vo.setFileHash(fileHash);
        return vo;
    }

    @Override
    @Transactional
    public AwardProofVO submitAwardProof(Long submitterId, AwardProofSubmitDTO dto) {
        if (dto.getStudentIds() == null || dto.getStudentIds().isEmpty()) {
            dto.setStudentIds(new ArrayList<>(List.of(submitterId)));
        } else if (!dto.getStudentIds().contains(submitterId)) {
            dto.getStudentIds().add(submitterId);
        }
        validateStudentIds(dto.getStudentIds());

        String fileHash = normalizeFileHash(dto.getFileHash(), dto.getFileUrl());
        AwardProof proof = new AwardProof();
        proof.setAiTaskId(dto.getAiTaskId());
        proof.setSubmitterId(submitterId);
        proof.setCompetitionId(dto.getCompetitionId());
        proof.setCompetitionName(dto.getCompetitionName());
        proof.setAwardLevel(dto.getAwardLevel());
        proof.setAwardTime(dto.getAwardTime());
        proof.setOrganizer(dto.getOrganizer());
        proof.setWinnerName(dto.getWinnerName());
        proof.setCertificateNo(dto.getCertificateNo());
        proof.setSealText(dto.getSealText());
        proof.setFileName(dto.getFileName());
        proof.setFileUrl(dto.getFileUrl());
        proof.setFileHash(fileHash);
        proof.setConfidence(dto.getConfidence());
        proof.setFieldConfidenceJson(dto.getFieldConfidenceJson());
        proof.setEvidenceJson(dto.getEvidenceJson());
        proof.setRiskFlagsJson(mergeRiskFlags(dto.getRiskFlagsJson(), dto, fileHash));
        proof.setStatus("pending");
        proof.setCreateTime(LocalDateTime.now());
        proof.setUpdateTime(LocalDateTime.now());
        this.save(proof);

        List<AwardProofStudent> links = dto.getStudentIds().stream().distinct().map(studentId -> {
            AwardProofStudent link = new AwardProofStudent();
            link.setAwardProofId(proof.getId());
            link.setStudentId(studentId);
            link.setCreateTime(LocalDateTime.now());
            return link;
        }).collect(Collectors.toList());
        awardProofStudentService.saveBatch(links);

        reviewTaskService.createPending("competition", proof.getCompetitionId(), "award_proof", proof.getId(),
                submitterId, "获奖证明审核：" + proof.getCompetitionName(), null,
                JSONUtil.toJsonStr(Map.of(
                        "competitionName", proof.getCompetitionName(),
                        "awardLevel", proof.getAwardLevel(),
                        "fileName", StrUtil.nullToEmpty(proof.getFileName()),
                        "studentIds", dto.getStudentIds()
                )));
        return toVO(proof);
    }

    @Override
    public Page<AwardProofVO> listMyAwardProofs(Long studentId, int current, int size) {
        List<AwardProofStudent> links = awardProofStudentService.list(new LambdaQueryWrapper<AwardProofStudent>()
                .eq(AwardProofStudent::getStudentId, studentId));
        if (CollUtil.isEmpty(links)) {
            Page<AwardProofVO> empty = new Page<>(current, size, 0);
            empty.setRecords(new ArrayList<>());
            return empty;
        }
        List<Long> proofIds = links.stream().map(AwardProofStudent::getAwardProofId).distinct().collect(Collectors.toList());
        Page<AwardProof> page = this.page(new Page<>(current, size), new LambdaQueryWrapper<AwardProof>()
                .in(AwardProof::getId, proofIds)
                .orderByDesc(AwardProof::getCreateTime));
        return toVOPage(page);
    }

    @Override
    public Page<AwardProofVO> listAuditAwardProofs(Long reviewerId, String role, int current, int size, String status) {
        Page<AwardProof> page = this.page(new Page<>(current, size), new LambdaQueryWrapper<AwardProof>()
                .eq(StrUtil.isNotBlank(status), AwardProof::getStatus, status)
                .orderByDesc(AwardProof::getCreateTime));
        List<AwardProofVO> records = page.getRecords().stream()
                .filter(proof -> "admin".equalsIgnoreCase(role) || canTeacherAccessProof(reviewerId, proof))
                .map(this::toVO)
                .collect(Collectors.toList());
        Page<AwardProofVO> voPage = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        voPage.setRecords(records);
        return voPage;
    }

    @Override
    public AwardProofVO getAwardProofDetail(Long id, Long userId, String role) {
        AwardProof proof = requireProof(id);
        if ("admin".equalsIgnoreCase(role)) {
            return toVO(proof);
        }
        if ("teacher".equalsIgnoreCase(role) && canTeacherAccessProof(userId, proof)) {
            return toVO(proof);
        }
        if ("student".equalsIgnoreCase(role) && isLinkedStudent(id, userId)) {
            return toVO(proof);
        }
        throw new BusinessException(403, "无权查看该获奖证明");
    }

    @Override
    @Transactional
    public void reviewAwardProof(Long reviewerId, String role, AwardProofReviewDTO dto) {
        AwardProof proof = requireProof(dto.getId());
        if (!"pending".equalsIgnoreCase(proof.getStatus())) {
            throw new BusinessException("该获奖证明已审核过，请勿重复处理");
        }
        if ("teacher".equalsIgnoreCase(role) && !canTeacherAccessProof(reviewerId, proof)) {
            throw new BusinessException(403, "无权审核其他学院学生的获奖证明");
        }

        String action = normalizeAction(dto.getAction());
        if (("rejected".equals(action) || "returned".equals(action)) && StrUtil.isBlank(dto.getReviewNote())) {
            throw new BusinessException("驳回或退回补充时必须填写审核意见");
        }

        proof.setStatus(action);
        proof.setReviewNote(dto.getReviewNote());
        proof.setReviewerId(reviewerId);
        proof.setReviewTime(LocalDateTime.now());
        proof.setUpdateTime(LocalDateTime.now());
        this.updateById(proof);
        reviewTaskService.resolveTarget("award_proof", proof.getId(), reviewerId, dto.getReviewNote());

        notifyAndWriteGrowth(proof, reviewerId, action, dto.getReviewNote());
    }

    private Map<String, Object> certificateSchemaHint() {
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("competitionName", "比赛/活动名称");
        schema.put("awardLevel", "获奖等级");
        schema.put("awardTime", "yyyy-MM-dd HH:mm:ss 或空字符串");
        schema.put("organizer", "主办单位");
        schema.put("winnerName", "获奖人或团队名称");
        schema.put("certificateNo", "证书编号");
        schema.put("sealText", "印章文字或落款单位");
        schema.put("confidence", 0.0);
        schema.put("fieldConfidence", Map.of("competitionName", 0.0));
        schema.put("evidence", Map.of("competitionName", "证据片段"));
        schema.put("riskFlags", List.of());
        return schema;
    }

    private AwardProofVO fromRecognitionResult(JsonNode result) {
        AwardProofVO vo = new AwardProofVO();
        vo.setCompetitionName(text(result, "competitionName"));
        vo.setAwardLevel(text(result, "awardLevel"));
        vo.setAwardTime(parseTime(text(result, "awardTime")));
        vo.setOrganizer(text(result, "organizer"));
        vo.setWinnerName(text(result, "winnerName"));
        vo.setCertificateNo(text(result, "certificateNo"));
        vo.setSealText(text(result, "sealText"));
        vo.setConfidence(readConfidence(result));
        if (result.has("fieldConfidence")) vo.setFieldConfidenceJson(result.get("fieldConfidence").toString());
        if (result.has("evidence")) vo.setEvidenceJson(result.get("evidence").toString());
        if (result.has("riskFlags")) vo.setRiskFlagsJson(result.get("riskFlags").toString());
        return vo;
    }

    private String mergeRiskFlags(String existingJson, AwardProofSubmitDTO dto, String fileHash) {
        JSONArray risks = parseRiskArray(existingJson);
        if (StrUtil.isNotBlank(fileHash)) {
            long duplicateFile = this.count(new LambdaQueryWrapper<AwardProof>()
                    .eq(AwardProof::getFileHash, fileHash));
            if (duplicateFile > 0) {
                risks.add("duplicate_file_hash");
            }
        }
        for (Long studentId : dto.getStudentIds()) {
            if (hasDuplicateStudentAward(studentId, dto)) {
                risks.add("duplicate_student_award:" + studentId);
            }
        }
        return risks.toString();
    }

    private boolean hasDuplicateStudentAward(Long studentId, AwardProofSubmitDTO dto) {
        List<AwardProofStudent> links = awardProofStudentService.list(new LambdaQueryWrapper<AwardProofStudent>()
                .eq(AwardProofStudent::getStudentId, studentId));
        if (CollUtil.isEmpty(links)) return false;
        List<Long> proofIds = links.stream().map(AwardProofStudent::getAwardProofId).collect(Collectors.toList());
        LambdaQueryWrapper<AwardProof> wrapper = new LambdaQueryWrapper<AwardProof>()
                .in(AwardProof::getId, proofIds)
                .eq(AwardProof::getAwardLevel, dto.getAwardLevel())
                .ne(AwardProof::getStatus, "rejected");
        if (dto.getCompetitionId() != null) {
            wrapper.eq(AwardProof::getCompetitionId, dto.getCompetitionId());
        } else {
            wrapper.eq(AwardProof::getCompetitionName, dto.getCompetitionName());
        }
        return this.count(wrapper) > 0;
    }

    private JSONArray parseRiskArray(String json) {
        if (StrUtil.isBlank(json) || !JSONUtil.isTypeJSON(json)) {
            return new JSONArray();
        }
        try {
            return JSONUtil.parseArray(json);
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    private void notifyAndWriteGrowth(AwardProof proof, Long reviewerId, String action, String note) {
        List<Long> studentIds = linkedStudentIds(proof.getId());
        String title = "approved".equals(action)
                ? "您的获奖证明已审核通过"
                : ("returned".equals(action) ? "您的获奖证明需要补充材料" : "您的获奖证明已被驳回");
        String content = "您提交的“" + proof.getCompetitionName() + " - " + proof.getAwardLevel() + "”获奖证明"
                + ("approved".equals(action) ? "已审核通过。" : ("returned".equals(action) ? "已退回补充。" : "未通过审核。"))
                + StrUtil.blankToDefault(note, "");

        for (Long studentId : studentIds) {
            Message msg = new Message();
            msg.setFromUser(reviewerId);
            msg.setToUser(studentId);
            msg.setTitle(title);
            msg.setContent(content);
            msg.setIsRead(0);
            msg.setCreateTime(LocalDateTime.now());
            messageService.save(msg);

            if ("approved".equals(action) && proof.getCompetitionId() != null) {
                long existing = growthRecordService.count(new LambdaQueryWrapper<GrowthRecord>()
                        .eq(GrowthRecord::getStudentId, studentId)
                        .eq(GrowthRecord::getCompetitionId, proof.getCompetitionId())
                        .eq(GrowthRecord::getRecordType, "award")
                        .eq(GrowthRecord::getTitle, proof.getCompetitionName() + " " + proof.getAwardLevel()));
                if (existing == 0) {
                    GrowthRecord record = new GrowthRecord();
                    record.setStudentId(studentId);
                    record.setCompetitionId(proof.getCompetitionId());
                    record.setRecordType("award");
                    record.setTitle(proof.getCompetitionName() + " " + proof.getAwardLevel());
                    record.setHappenTime(proof.getAwardTime() != null ? proof.getAwardTime() : LocalDateTime.now());
                    growthRecordService.save(record);
                }
            }
        }
    }

    private boolean canTeacherAccessProof(Long teacherId, AwardProof proof) {
        User teacher = userService.getById(teacherId);
        if (teacher == null || StrUtil.isBlank(teacher.getCollege())) {
            return false;
        }
        List<Long> studentIds = linkedStudentIds(proof.getId());
        if (CollUtil.isEmpty(studentIds)) {
            studentIds = List.of(proof.getSubmitterId());
        }
        List<User> students = userService.listByIds(studentIds);
        return students.size() == studentIds.size()
                && students.stream().allMatch(student -> teacher.getCollege().equals(student.getCollege()));
    }

    private boolean isLinkedStudent(Long proofId, Long userId) {
        if (userId == null) return false;
        return awardProofStudentService.count(new LambdaQueryWrapper<AwardProofStudent>()
                .eq(AwardProofStudent::getAwardProofId, proofId)
                .eq(AwardProofStudent::getStudentId, userId)) > 0;
    }

    private List<Long> linkedStudentIds(Long proofId) {
        return awardProofStudentService.list(new LambdaQueryWrapper<AwardProofStudent>()
                        .eq(AwardProofStudent::getAwardProofId, proofId))
                .stream()
                .map(AwardProofStudent::getStudentId)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
    }

    private void validateStudentIds(List<Long> studentIds) {
        if (CollUtil.isEmpty(studentIds)) {
            throw new BusinessException("至少关联一名学生");
        }
        List<User> users = userService.listByIds(studentIds.stream().distinct().collect(Collectors.toList()));
        if (users.size() != studentIds.stream().distinct().count()
                || users.stream().anyMatch(user -> !"student".equalsIgnoreCase(user.getRole()))) {
            throw new BusinessException("关联学生不存在或不是学生角色");
        }
    }

    private AwardProof requireProof(Long id) {
        AwardProof proof = this.getById(id);
        if (proof == null) {
            throw new BusinessException("获奖证明不存在");
        }
        return proof;
    }

    private Page<AwardProofVO> toVOPage(Page<AwardProof> page) {
        Page<AwardProofVO> voPage = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        voPage.setRecords(page.getRecords().stream().map(this::toVO).collect(Collectors.toList()));
        return voPage;
    }

    private AwardProofVO toVO(AwardProof proof) {
        AwardProofVO vo = new AwardProofVO();
        BeanUtils.copyProperties(proof, vo);
        User submitter = userService.getById(proof.getSubmitterId());
        if (submitter != null) {
            vo.setSubmitterName(submitter.getRealName());
            vo.setSubmitterNo(submitter.getUsername());
            vo.setCollege(submitter.getCollege());
        }
        if (proof.getCompetitionId() != null) {
            Competition competition = competitionService.getById(proof.getCompetitionId());
            if (competition != null && StrUtil.isBlank(vo.getCompetitionName())) {
                vo.setCompetitionName(competition.getName());
            }
        }
        List<Long> studentIds = linkedStudentIds(proof.getId());
        if (CollUtil.isNotEmpty(studentIds)) {
            Map<Long, User> userMap = userService.listByIds(studentIds).stream()
                    .collect(Collectors.toMap(User::getId, user -> user, (a, b) -> a));
            vo.setStudents(studentIds.stream().map(id -> {
                User student = userMap.get(id);
                if (student == null) return null;
                AwardProofVO.TeamMemberVO member = new AwardProofVO.TeamMemberVO();
                member.setStudentId(student.getId());
                member.setStudentName(student.getRealName());
                member.setStudentNo(student.getUsername());
                member.setCollege(student.getCollege());
                member.setMajor(student.getMajor());
                member.setClassName(student.getClassName());
                return member;
            }).filter(Objects::nonNull).collect(Collectors.toList()));
        } else {
            vo.setStudents(new ArrayList<>());
        }
        return vo;
    }

    private String normalizeAction(String action) {
        if ("approve".equalsIgnoreCase(action) || "approved".equalsIgnoreCase(action)) return "approved";
        if ("reject".equalsIgnoreCase(action) || "rejected".equalsIgnoreCase(action)) return "rejected";
        if ("return".equalsIgnoreCase(action) || "returned".equalsIgnoreCase(action)) return "returned";
        throw new BusinessException("不支持的审核动作");
    }

    private String normalizeFileHash(String providedHash, String fileUrl) {
        if (StrUtil.isNotBlank(providedHash)) {
            return providedHash;
        }
        return StrUtil.isBlank(fileUrl) ? null : SecureUtil.sha256(fileUrl);
    }

    private BigDecimal readConfidence(JsonNode node) {
        JsonNode value = node.get("confidence");
        return value != null && value.isNumber() ? BigDecimal.valueOf(value.asDouble()) : null;
    }

    private String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? null : value.asText();
    }

    private LocalDateTime parseTime(String text) {
        if (StrUtil.isBlank(text)) return null;
        try {
            if (text.length() == 10) {
                return java.time.LocalDate.parse(text).atStartOfDay();
            }
            return LocalDateTime.parse(text, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        } catch (Exception e) {
            return null;
        }
    }
}
