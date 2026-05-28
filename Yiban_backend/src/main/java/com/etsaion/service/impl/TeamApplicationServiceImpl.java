package com.etsaion.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.etsaion.dto.TeamApplyDTO;
import com.etsaion.entity.Competition;
import com.etsaion.entity.Message;
import com.etsaion.entity.TeamApplication;
import com.etsaion.entity.TeamPost;
import com.etsaion.exception.BusinessException;
import com.etsaion.mapper.TeamApplicationMapper;
import com.etsaion.service.CompetitionService;
import com.etsaion.service.MessageService;
import com.etsaion.service.TeamApplicationService;
import com.etsaion.service.TeamPostService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class TeamApplicationServiceImpl extends ServiceImpl<TeamApplicationMapper, TeamApplication> implements TeamApplicationService {

    @Autowired
    @Lazy
    private TeamPostService teamPostService;

    @Autowired
    private CompetitionService competitionService;

    @Autowired
    private MessageService messageService;

    @Override
    @Transactional
    public TeamApplication applyToJoin(Long studentId, TeamApplyDTO dto) {
        TeamPost post = teamPostService.getById(dto.getTeamId());
        if (post == null) {
            throw new BusinessException("招募贴不存在");
        }
        if (!"招募中".equalsIgnoreCase(post.getStatus())) {
            throw new BusinessException("该队伍招募已结束（已满员或已解散）");
        }

        // Validate if applicant is the author
        if (post.getAuthorId().equals(studentId)) {
            throw new BusinessException("您是该帖子的发布者，无需申请");
        }

        // Validate if already applied (pending or approved)
        long existingCount = this.count(new LambdaQueryWrapper<TeamApplication>()
                .eq(TeamApplication::getTeamId, dto.getTeamId())
                .eq(TeamApplication::getApplicantId, studentId)
                .ne(TeamApplication::getStatus, "rejected"));
        if (existingCount > 0) {
            throw new BusinessException("您已有该队伍的申请，请勿重复申请");
        }

        TeamApplication app = new TeamApplication();
        app.setTeamId(dto.getTeamId());
        app.setApplicantId(studentId);
        app.setRole(dto.getRole());
        app.setReason(dto.getReason());
        app.setStatus("pending");
        app.setCreateTime(LocalDateTime.now());

        this.save(app);

        // Notify the captain
        Message msg = new Message();
        msg.setFromUser(0L);
        msg.setToUser(post.getAuthorId());
        msg.setTitle("收到新的入队申请");
        msg.setContent(String.format("有同学申请加入您的招募帖，申请角色：%s。请及时处理。", app.getRole()));
        msg.setIsRead(0);
        msg.setCreateTime(LocalDateTime.now());
        messageService.save(msg);

        return app;
    }

    @Override
    @Transactional
    public void handleApplication(Long captainId, Long applicationId, String status) {
        TeamApplication app = this.getById(applicationId);
        if (app == null) {
            throw new BusinessException("申请记录不存在");
        }
        if (!"pending".equalsIgnoreCase(app.getStatus())) {
            throw new BusinessException("该申请已处理完毕");
        }

        TeamPost post = teamPostService.getById(app.getTeamId());
        if (post == null) {
            throw new BusinessException("关联的招募贴不存在");
        }

        // Check if operator is the captain (author of the post)
        if (!post.getAuthorId().equals(captainId)) {
            throw new BusinessException("只有发布者才能处理入队申请");
        }

        if ("approved".equalsIgnoreCase(status)) {
            app.setStatus("approved");
            this.updateById(app);

            // Send notification message
            Message msg = new Message();
            msg.setFromUser(0L);
            msg.setToUser(app.getApplicantId());
            msg.setTitle("组队招募申请通过通知");
            msg.setContent(String.format("恭喜！您申请加入招募帖“%s”的申请已通过！担任角色：%s。", 
                    post.getContent().substring(0, Math.min(post.getContent().length(), 15)) + "...", app.getRole()));
            msg.setIsRead(0);
            msg.setCreateTime(LocalDateTime.now());
            messageService.save(msg);

        } else if ("rejected".equalsIgnoreCase(status)) {
            app.setStatus("rejected");
            this.updateById(app);

            // Send notification message
            Message msg = new Message();
            msg.setFromUser(0L);
            msg.setToUser(app.getApplicantId());
            msg.setTitle("组队招募申请被拒绝通知");
            msg.setContent(String.format("很遗憾，您申请加入招募帖“%s”的申请已被拒绝。", 
                    post.getContent().substring(0, Math.min(post.getContent().length(), 15)) + "..."));
            msg.setIsRead(0);
            msg.setCreateTime(LocalDateTime.now());
            messageService.save(msg);
        } else {
            throw new BusinessException("非法的审核状态");
        }
    }

    @Override
    public List<TeamApplication> listApplicationsForTeam(Long captainId, Long teamId) {
        TeamPost post = teamPostService.getById(teamId);
        if (post == null) {
            throw new BusinessException("招募贴不存在");
        }
        if (!post.getAuthorId().equals(captainId)) {
            throw new BusinessException("只有发布者才能查看申请列表");
        }

        return this.list(new LambdaQueryWrapper<TeamApplication>()
                .eq(TeamApplication::getTeamId, teamId)
                .orderByDesc(TeamApplication::getCreateTime));
    }
}
