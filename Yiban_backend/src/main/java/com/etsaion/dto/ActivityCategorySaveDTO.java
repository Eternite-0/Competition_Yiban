package com.etsaion.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;

@Data
public class ActivityCategorySaveDTO {
    private String type;
    private String code;

    @NotBlank(message = "分类名称不能为空")
    private String name;

    private String icon;
    private Integer sortOrder;
    private String status;
}
