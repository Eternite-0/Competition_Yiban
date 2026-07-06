package com.etsaion.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GrowthTimelineItemVO {
    private String id;
    private String sourceType;
    private String title;
    private String subtitle;
    private String status;
    private String dimensionKey;
    private String activityType;
    private LocalDateTime happenTime;
}
