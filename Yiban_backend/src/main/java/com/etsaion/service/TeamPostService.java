package com.etsaion.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.etsaion.dto.TeamPostCreateDTO;
import com.etsaion.entity.TeamPost;
import com.etsaion.vo.TeamVO;

public interface TeamPostService extends IService<TeamPost> {
    TeamPost createTeamPost(Long studentId, TeamPostCreateDTO dto);
    TeamVO getTeamPostDetails(Long id);
    Page<TeamVO> listTeamPostsPage(int current, int size, Long competitionId, String status);
}
