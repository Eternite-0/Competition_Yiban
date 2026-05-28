package com.etsaion.dto;

import com.etsaion.config.FlexibleLocalDateTimeDeserializer;
import com.etsaion.config.FlexibleStringListDeserializer;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import lombok.Data;

import javax.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
public class ActivitySaveDTO {
    private String type;

    @NotBlank(message = "活动名称不能为空")
    private String title;

    private String level;
    private String category;
    private String organizer;
    @JsonDeserialize(using = FlexibleLocalDateTimeDeserializer.class)
    private LocalDateTime startTime;
    @JsonDeserialize(using = FlexibleLocalDateTimeDeserializer.class)
    private LocalDateTime endTime;
    @JsonDeserialize(using = FlexibleLocalDateTimeDeserializer.class)
    private LocalDateTime activityStart;
    @JsonDeserialize(using = FlexibleLocalDateTimeDeserializer.class)
    private LocalDateTime activityEnd;
    private Integer maxTeamSize;
    private Integer maxParticipants;
    private String coverUrl;
    private String content;
    @JsonDeserialize(using = FlexibleStringListDeserializer.class)
    private List<String> tags;

    @JsonDeserialize(using = FlexibleStringListDeserializer.class)
    private List<String> tracks;
    private String location;
    private BigDecimal serviceHours;
    private String status;
    private Map<String, Object> config;
}
