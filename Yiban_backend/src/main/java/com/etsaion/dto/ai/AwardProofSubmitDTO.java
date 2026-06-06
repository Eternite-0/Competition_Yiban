package com.etsaion.dto.ai;

import com.etsaion.config.FlexibleLocalDateTimeDeserializer;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import lombok.Data;

import javax.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class AwardProofSubmitDTO {
    private Long aiTaskId;
    private Long competitionId;
    @NotBlank(message = "比赛名称不能为空")
    private String competitionName;
    @NotBlank(message = "获奖等级不能为空")
    private String awardLevel;
    @JsonDeserialize(using = FlexibleLocalDateTimeDeserializer.class)
    private LocalDateTime awardTime;
    private String organizer;
    private String winnerName;
    private String certificateNo;
    private String sealText;
    private String fileName;
    @NotBlank(message = "证书图片地址不能为空")
    private String fileUrl;
    private String fileHash;
    private BigDecimal confidence;
    private String fieldConfidenceJson;
    private String evidenceJson;
    private String riskFlagsJson;
    private List<Long> studentIds;
}
