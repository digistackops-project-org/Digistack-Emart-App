package com.emart.login.exception;

public class DuplicateUserException extends RuntimeException {
    public DuplicateUserException(String message) { super(message); }
}
