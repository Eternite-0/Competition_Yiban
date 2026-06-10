package com.etsaion.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ActivityCategoryVO {
    private Long id;
    private String type;
    private String code;
    private String name;
    private String icon;
    private Integer sortOrder;
    private String status;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
