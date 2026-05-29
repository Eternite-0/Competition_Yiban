package com.etsaion.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.etsaion.dto.TeamPostCreateDTO;
import com.etsaion.entity.Competition;
import com.etsaion.entity.TeamPost;
import com.etsaion.entity.User;
import com.etsaion.exception.BusinessException;
import com.etsaion.mapper.TeamPostMapper;
import com.etsaion.service.CompetitionService;
import com.etsaion.service.TeamPostService;
import com.etsaion.service.UserService;
import com.etsaion.vo.TeamVO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class TeamPostServiceImpl extends ServiceImpl<TeamPostMapper, TeamPost> implements TeamPostService {

    @Autowired
    private CompetitionService competitionService;

    @Autowired
    private UserService userService;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public TeamPost createTeamPost(Long studentId, TeamPostCreateDTO dto) {
        Competition comp = competitionService.getById(dto.getCompetitionId());
        if (comp == null) {
            throw new BusinessException("关联的赛事不存在");
        }
        if (!"published".equalsIgnoreCase(comp.getStatus())) {
            throw new BusinessException("该赛事当前未开放，无法发布组队招募");
        }

        // Check for existing active post by same student for same competition
        long existingCount = this.count(new LambdaQueryWrapper<TeamPost>()
                .eq(TeamPost::getAuthorId, studentId)
                .eq(TeamPost::getCompetitionId, dto.getCompetitionId())
                .eq(TeamPost::getStatus, "招募中"));
        if (existingCount > 0) {
            throw new BusinessException("您已为该赛事发布过招募帖，请勿重复发布");
        }

        TeamPost post = new TeamPost();
        post.setAuthorId(studentId);
        post.setCompetitionId(dto.getCompetitionId());
        post.setContent(dto.getContent());
        
        if (CollUtil.isNotEmpty(dto.getRolesNeeded())) {
            post.setRolesNeeded(JSONUtil.toJsonStr(dto.getRolesNeeded()));
        } else {
            post.setRolesNeeded("[]");
        }
        
        post.setDate(LocalDateTime.now());
        post.setStatus("招募中");

        this.save(post);
        return post;
    }

    @Override
    public TeamVO getTeamPostDetails(Long id) {
        TeamPost post = this.getById(id);
        if (post == null) {
            throw new BusinessException("招募贴不存在");
        }

        TeamVO vo = new TeamVO();
        vo.setId(post.getId());
        vo.setAuthorId(post.getAuthorId());
        vo.setCompetitionId(post.getCompetitionId());
        vo.setContent(post.getContent());
        vo.setDate(post.getDate());
        vo.setStatus(post.getStatus());

        // Parse JSON array of roles Needed
        if (JSONUtil.isTypeJSON(post.getRolesNeeded())) {
            vo.setRolesNeeded(JSONUtil.toList(post.getRolesNeeded(), String.class));
        } else {
            vo.setRolesNeeded(new ArrayList<>());
        }

        // Competition info
        Competition comp = competitionService.getById(post.getCompetitionId());
        if (comp != null) {
            vo.setCompetitionName(comp.getName());
        }

        // Author info
        User author = userService.getById(post.getAuthorId());
        if (author != null) {
            vo.setAuthorName(author.getRealName());
        }

        return vo;
    }

    @Override
    public Page<TeamVO> listTeamPostsPage(int current, int size, Long competitionId, String status) {
        Page<TeamPost> page = new Page<>(current, size);
        LambdaQueryWrapper<TeamPost> wrapper = new LambdaQueryWrapper<>();
        
        wrapper.eq(competitionId != null, TeamPost::getCompetitionId, competitionId)
               .eq(StrUtil.isNotBlank(status), TeamPost::getStatus, status)
               .orderByDesc(TeamPost::getDate);

        Page<TeamPost> postPage = this.page(page, wrapper);

        Page<TeamVO> voPage = new Page<>(current, size);
        voPage.setTotal(postPage.getTotal());
        
        List<TeamVO> voList = postPage.getRecords().stream()
                .map(post -> getTeamPostDetails(post.getId()))
                .collect(Collectors.toList());
        voPage.setRecords(voList);

        return voPage;
    }
}
