package com.etsaion.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;

@Data
public class ReviewTaskActionDTO {
    @NotBlank(message = "审核动作不能为空")
    private String action; // approve, reject, return
    private String reviewNote;
}
