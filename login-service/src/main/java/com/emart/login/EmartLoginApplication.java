package com.emart.login;

import io.mongock.runner.springboot.EnableMongock;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@EnableMongock
public class EmartLoginApplication {
    public static void main(String[] args) {
        SpringApplication.run(EmartLoginApplication.class, args);
    }
}
