package com.etsaion.vo;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class CompetitionVO {
    private Long id;
    private String name;
    private String level;
    private String category;
    private String organizer;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private LocalDateTime competitionStart;
    private LocalDateTime competitionEnd;
    private Integer maxTeamSize;
    private String coverUrl;
    private String content;
    private List<String> tags;
    private List<String> tracks;
    private String status;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
