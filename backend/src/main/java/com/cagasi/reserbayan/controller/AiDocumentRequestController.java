package com.cagasi.reserbayan.controller;

import java.util.Collections;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.cagasi.reserbayan.dto.AiAnalysisDTO;
import com.cagasi.reserbayan.dto.AiAttachmentMetadataDTO;
import com.cagasi.reserbayan.dto.DocumentRequestDTO;
import com.cagasi.reserbayan.config.JwtUtil;
import com.cagasi.reserbayan.entity.DocumentType;
import com.cagasi.reserbayan.entity.Resident;
import com.cagasi.reserbayan.repository.DocumentTypeRepository;
import com.cagasi.reserbayan.repository.ResidentRepository;
import com.cagasi.reserbayan.service.AiRequirementAnalysisService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/document-requests/ai")
public class AiDocumentRequestController {

    private final AiRequirementAnalysisService analysisService;
    private final DocumentTypeRepository documentTypeRepository;
    private final ResidentRepository residentRepository;
    private final ObjectMapper objectMapper;
    private final JwtUtil jwtUtil;

    public AiDocumentRequestController(AiRequirementAnalysisService analysisService,
            DocumentTypeRepository documentTypeRepository,
            ResidentRepository residentRepository,
            ObjectMapper objectMapper,
            JwtUtil jwtUtil) {
        this.analysisService = analysisService;
        this.documentTypeRepository = documentTypeRepository;
        this.residentRepository = residentRepository;
        this.objectMapper = objectMapper;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping(value = "/preview-check", consumes = { "multipart/form-data" })
    public ResponseEntity<?> previewCheck(
            @RequestParam("data") String dataJson,
            @RequestParam(value = "files", required = false) List<MultipartFile> files,
            @RequestParam(value = "attachmentMetadata", required = false) String attachmentMetadataJson,
            HttpServletRequest request) {
        if (!isAuthenticated(request)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            DocumentRequestDTO dto = objectMapper.readValue(dataJson, DocumentRequestDTO.class);
            DocumentType documentType = documentTypeRepository.findByDocumentId(dto.getDocumentId())
                    .orElseThrow(() -> new RuntimeException("Document type not found"));
            Resident resident = resolveResident(request, dto);
            AiAnalysisDTO analysis = analysisService.analyzePreview(documentType, resident, files,
                    parseMetadata(attachmentMetadataJson));
            return ResponseEntity.ok(analysis);
        } catch (Exception e) {
            AiAnalysisDTO unavailable = new AiAnalysisDTO();
            unavailable.setOverallStatus("ERROR");
            unavailable.setSummary("AI check is unavailable right now. Staff can still review the request manually.");
            return ResponseEntity.ok(unavailable);
        }
    }

    @GetMapping("/{requestId}/analysis")
    public ResponseEntity<?> getAnalysis(@PathVariable Long requestId, HttpServletRequest request) {
        if (!isAuthenticated(request)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return analysisService.getSavedAnalysis(requestId)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.ok(analysisService.analyzeAndSave(requestId)));
    }

    @PostMapping("/{requestId}/reanalyze")
    public ResponseEntity<?> reanalyze(@PathVariable Long requestId, HttpServletRequest request) {
        if (!isAuthenticated(request)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            return ResponseEntity.ok(analysisService.analyzeAndSave(requestId));
        } catch (Exception e) {
            AiAnalysisDTO unavailable = new AiAnalysisDTO();
            unavailable.setRequestId(requestId);
            unavailable.setOverallStatus("ERROR");
            unavailable.setSummary("AI recheck failed. Staff can still review the request manually.");
            return ResponseEntity.ok(unavailable);
        }
    }

    private boolean isAuthenticated(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        return authHeader != null && authHeader.startsWith("Bearer ");
    }

    private Resident resolveResident(HttpServletRequest request, DocumentRequestDTO dto) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                String username = jwtUtil.extractUsername(authHeader.substring(7));
                Resident resident = residentRepository.findByResidentEmail(username).orElse(null);
                if (resident != null) {
                    return resident;
                }
            } catch (Exception ignored) {
                // Keep the advisory preview available for legacy tokens; saved requests use the persisted resident.
            }
        }
        return dto.getResidentId() == null
                ? null
                : residentRepository.findById(dto.getResidentId()).orElse(null);
    }

    private List<AiAttachmentMetadataDTO> parseMetadata(String attachmentMetadataJson) {
        if (attachmentMetadataJson == null || attachmentMetadataJson.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(attachmentMetadataJson, new TypeReference<List<AiAttachmentMetadataDTO>>() {
            });
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}
