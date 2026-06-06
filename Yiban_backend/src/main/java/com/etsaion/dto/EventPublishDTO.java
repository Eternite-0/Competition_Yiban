package com.etsaion.dto;

import com.etsaion.config.FlexibleLocalDateTimeDeserializer;
import com.etsaion.config.FlexibleStringListDeserializer;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import lombok.Data;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class EventPublishDTO {
    @NotBlank(message = "赛事名称不能为空")
    private String name;

    @NotBlank(message = "赛事级别不能为空")
    private String level; // 国家级/省级/校级/院级

    @NotBlank(message = "赛事类别不能为空")
    private String category;

    private String organizer;

    @NotNull(message = "报名开始时间不能为空")
    @JsonDeserialize(using = FlexibleLocalDateTimeDeserializer.class)
    private LocalDateTime startTime;

    @NotNull(message = "报名截止时间不能为空")
    @JsonDeserialize(using = FlexibleLocalDateTimeDeserializer.class)
    private LocalDateTime endTime;

    @JsonDeserialize(using = FlexibleLocalDateTimeDeserializer.class)
    private LocalDateTime competitionStart;
    @JsonDeserialize(using = FlexibleLocalDateTimeDeserializer.class)
    private LocalDateTime competitionEnd;

    @NotNull(message = "最大团队人数不能为空")
    @Min(value = 1, message = "最大团队人数必须大于等于1")
    private Integer maxTeamSize;

    private String coverUrl;
    private String sourceUrl;
    private String content;
    @JsonDeserialize(using = FlexibleStringListDeserializer.class)
    private List<String> tags;

    @JsonDeserialize(using = FlexibleStringListDeserializer.class)
    private List<String> tracks;
    private String status; // draft / published, optional - defaults to published
}
