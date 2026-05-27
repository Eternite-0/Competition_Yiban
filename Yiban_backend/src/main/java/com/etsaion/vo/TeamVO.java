package com.etsaion.vo;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class TeamVO {
    private Long id;
    private Long authorId;
    private String authorName;
    private Long competitionId;
    private String competitionName;
    private String content;
    private List<String> rolesNeeded; // JSON parsed roles
    private LocalDateTime date;
    private String status; // 招募中, 已满员
}
