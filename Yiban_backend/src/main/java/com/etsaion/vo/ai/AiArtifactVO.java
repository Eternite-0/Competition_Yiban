package com.etsaion.vo.ai;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AiArtifactVO {
    private String id;
    private String name;
    private String type;
    private String url;
    private String description;
    private LocalDateTime createTime;
}
