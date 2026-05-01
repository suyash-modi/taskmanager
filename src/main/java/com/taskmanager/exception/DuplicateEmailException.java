package com.taskmanager.exception;

import org.springframework.http.HttpStatus;

public class DuplicateEmailException extends ApiException {

    public DuplicateEmailException(String message) {
        super(HttpStatus.CONFLICT, "DUPLICATE_EMAIL", message);
    }
}
