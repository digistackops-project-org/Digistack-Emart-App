package com.emart.login.repository;

import com.emart.login.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {

    Optional<User> findByEmail(String email);

    Optional<User> findByPhone(String phone);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    @Query("{ 'email': ?0, 'enabled': true, 'locked': false }")
    Optional<User> findActiveUserByEmail(String email);

    @Query("{ 'phone': ?0, 'enabled': true }")
    Optional<User> findActiveUserByPhone(String phone);

    long countByEnabled(boolean enabled);
}
