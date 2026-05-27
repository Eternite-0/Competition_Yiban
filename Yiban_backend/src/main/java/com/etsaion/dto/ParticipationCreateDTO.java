package com.etsaion.dto;

import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class ParticipationCreateDTO {
    private String teamName;
    private String track;
    private List<Long> memberStudentIds;
    private Map<String, Object> metadata;
}
