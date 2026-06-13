package com.cagasi.reserbayan.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cagasi.reserbayan.entity.DocumentRequestAnalysis;

public interface DocumentRequestAnalysisRepository extends JpaRepository<DocumentRequestAnalysis, Long> {
    Optional<DocumentRequestAnalysis> findByDocumentRequest_RequestId(Long requestId);
}
