package com.etsaion;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.etsaion.mapper")
public class EtsaionApplication {
    public static void main(String[] args) {
        SpringApplication.run(EtsaionApplication.class, args);
    }
}
