package com.etsaion.dto;

import lombok.Data;
import javax.validation.constraints.NotNull;

@Data
public class AuditDTO {
    @NotNull(message = "审核结果不能为空")
    private Boolean approve; // true: 同意通过, false: 驳回拒绝

    private String reviewNote; // 驳回理由或评语 (选填)
}
