package com.etsaion.vo;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AcademicTermVO {
    private String academicYear;
    private String term;
    private String label;
}
