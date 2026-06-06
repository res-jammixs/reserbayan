package com.cagasi.reserbayan.repository;

import com.cagasi.reserbayan.entity.DocumentRequest;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DocumentRequestRepository extends JpaRepository<DocumentRequest, Long> {
    
    @EntityGraph(attributePaths = {"attachments", "documentType", "resident"})
    List<DocumentRequest> findByResident_ResidentId(Long residentId);

    @Override
    @EntityGraph(attributePaths = {"attachments", "documentType", "resident"})
    List<DocumentRequest> findAll();

    @EntityGraph(attributePaths = {"attachments", "documentType", "resident"})
    Optional<DocumentRequest> findByRequestId(Long requestId);
}
