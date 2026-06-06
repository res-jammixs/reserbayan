package com.cagasi.reserbayan.controller;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URLConnection;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.cagasi.reserbayan.dto.DocumentRequestDTO;
import com.cagasi.reserbayan.dto.DocumentRequestUpdateDTO;
import com.cagasi.reserbayan.entity.DocumentRequest;
import com.cagasi.reserbayan.entity.DocumentType;
import com.cagasi.reserbayan.entity.RequestAttachment;
import com.cagasi.reserbayan.entity.Resident;
import com.cagasi.reserbayan.entity.ResidentStatus;
import com.cagasi.reserbayan.repository.DocumentRequestRepository;
import com.cagasi.reserbayan.repository.DocumentTypeRepository;
import com.cagasi.reserbayan.repository.RequestAttachmentRepository;
import com.cagasi.reserbayan.repository.ResidentRepository;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import com.cagasi.reserbayan.service.AdminNotificationService;
import com.cagasi.reserbayan.service.NotificationService;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/document-requests")
@CrossOrigin(origins = { "http://localhost:3000", "http://localhost:3001", "http://localhost:3002" })
public class DocumentRequestController {

    @Autowired
    private DocumentRequestRepository documentRequestRepository;

    @Autowired
    private DocumentTypeRepository documentTypeRepository;

    @Autowired
    private RequestAttachmentRepository requestAttachmentRepository;

    @Autowired
    private ResidentRepository residentRepository;

    @Autowired
    private AdminNotificationService adminNotificationService;

    @Autowired
    private NotificationService notificationService;

    // Define the folder where files will be saved
    private static final String UPLOAD_DIR = System.getProperty("user.dir") + "/uploads/";

    @GetMapping
    public ResponseEntity<List<DocumentRequestDTO>> getAllDocumentRequests(HttpServletRequest request) {
        try {
            String authHeader = request.getHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            // Here you would validate the JWT token and get user info
            // For now, returning all requests
            List<DocumentRequest> requests = documentRequestRepository.findAll();
            List<DocumentRequestDTO> dtos = requests.stream()
                    .map(this::convertToDTO)
                    .toList();

            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // NEW: Get document requests by resident ID
    @GetMapping("/resident/{residentId}")
    public ResponseEntity<List<DocumentRequestDTO>> getDocumentRequestsByResidentId(
            @PathVariable Long residentId,
            HttpServletRequest request) {
        try {
            String authHeader = request.getHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            // Verify the resident exists
            Optional<Resident> residentOpt = residentRepository.findById(residentId);
            if (residentOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            List<DocumentRequest> requests = documentRequestRepository.findByResident_ResidentId(residentId);
            List<DocumentRequestDTO> dtos = requests.stream()
                    .map(this::convertToDTO)
                    .toList();

            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<DocumentRequestDTO> getDocumentRequestById(@PathVariable Long id,
            HttpServletRequest request) {
        try {
            String authHeader = request.getHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            Optional<DocumentRequest> requestOpt = documentRequestRepository.findByRequestId(id);
            if (requestOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            DocumentRequestDTO dto = convertToDTO(requestOpt.get());
            return ResponseEntity.ok(dto);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping(consumes = { "multipart/form-data" })
    @Transactional
    public ResponseEntity<?> createDocumentRequest(
            @RequestParam("data") String dataJson,
            @RequestParam(value = "files", required = false) List<MultipartFile> files,
            HttpServletRequest request) {
        try {
            String authHeader = request.getHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            DocumentRequestDTO dto = parseJson(dataJson);
            Resident resident = residentRepository.findById(dto.getResidentId())
                    .orElseThrow(() -> new RuntimeException("Resident not found"));

            // Find the DocumentType based on documentId for proper JPA relationship
            DocumentType documentType = documentTypeRepository.findByDocumentId(dto.getDocumentId())
                    .orElseThrow(() -> new RuntimeException("Document type not found"));

            DocumentRequest documentRequest = new DocumentRequest();
            documentRequest.setDocumentType(documentType); // This will also set documentId and documentName via the setter
            documentRequest.setResident(resident);
            documentRequest.setDetails(dto.getDetails());
            documentRequest.setStatus("Pending");
            documentRequest.setSubmittedAt(java.time.LocalDateTime.now());

            DocumentRequest savedRequest = documentRequestRepository.save(documentRequest);

            adminNotificationService.createNotification(
                    "New Document Request",
                    resident.getFirstName() + " " + resident.getLastName() + " requested "
                            + savedRequest.getDocumentName() + ".",
                    "DOCUMENT_REQUEST_CREATED",
                    AdminNotificationService.CATEGORY_REQUESTS,
                    AdminNotificationService.TARGET_DOCUMENT_REQUEST,
                    savedRequest.getRequestId());

            // Handle file uploads
            if (files != null && !files.isEmpty()) {
                for (MultipartFile file : files) {
                    if (!file.isEmpty()) {
                        String filename = System.currentTimeMillis() + "_" + file.getOriginalFilename();
                        Path uploadPath = Paths.get(UPLOAD_DIR);

                        if (!Files.exists(uploadPath)) {
                            Files.createDirectories(uploadPath);
                        }

                        Path filePath = uploadPath.resolve(filename);
                        Files.copy(file.getInputStream(), filePath);

                        RequestAttachment attachment = new RequestAttachment();
                        attachment.setFileName(file.getOriginalFilename());
                        attachment.setFilePath(filename);
                        attachment.setFileType(file.getContentType());
                        attachment.setFileSize(file.getSize());
                        attachment.setDocumentRequest(savedRequest);

                        requestAttachmentRepository.save(attachment);
                    }
                }
            }

            DocumentRequestDTO savedDto = convertToDTO(savedRequest);
            return ResponseEntity.ok(savedDto);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error creating document request: " + e.getMessage());
        }
    }

    @PutMapping(value = "/{id}", consumes = { "multipart/form-data" })
    @Transactional
    public ResponseEntity<?> updateDocumentRequest(
            @PathVariable Long id,
            @RequestParam("data") String dataJson,
            @RequestParam(value = "files", required = false) List<MultipartFile> files,
            @RequestParam(value = "filesToRemove", required = false) List<Long> filesToRemove,
            HttpServletRequest request) {
        try {
            String authHeader = request.getHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            DocumentRequestUpdateDTO updateDto = parseUpdateJson(dataJson);
            DocumentRequest documentRequest = documentRequestRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Document request not found"));

            // Update details
            documentRequest.setDetails(updateDto.getDetails());
            documentRequest.setUpdatedAt(java.time.LocalDateTime.now());

            // Remove files if specified
            if (updateDto.getFilesToRemove() != null && !updateDto.getFilesToRemove().isEmpty()) {
                for (Long fileId : updateDto.getFilesToRemove()) {
                    RequestAttachment attachment = requestAttachmentRepository.findById(fileId)
                            .orElseThrow(() -> new RuntimeException("Attachment not found"));

                    // Delete physical file
                    Path filePath = Paths.get(UPLOAD_DIR, attachment.getFilePath());
                    try {
                        Files.deleteIfExists(filePath);
                    } catch (IOException e) {
                        // Log error but continue
                        System.err.println("Error deleting file: " + e.getMessage());
                    }

                    requestAttachmentRepository.delete(attachment);
                }
            }

            // Add new files
            if (files != null && !files.isEmpty()) {
                for (MultipartFile file : files) {
                    if (!file.isEmpty()) {
                        String filename = System.currentTimeMillis() + "_" + file.getOriginalFilename();
                        Path uploadPath = Paths.get(UPLOAD_DIR);

                        if (!Files.exists(uploadPath)) {
                            Files.createDirectories(uploadPath);
                        }

                        Path filePath = uploadPath.resolve(filename);
                        Files.copy(file.getInputStream(), filePath);

                        RequestAttachment attachment = new RequestAttachment();
                        attachment.setFileName(file.getOriginalFilename());
                        attachment.setFilePath(filename);
                        attachment.setFileType(file.getContentType());
                        attachment.setFileSize(file.getSize());
                        attachment.setDocumentRequest(documentRequest);

                        requestAttachmentRepository.save(attachment);
                    }
                }
            }

            DocumentRequest savedRequest = documentRequestRepository.save(documentRequest);
            adminNotificationService.createNotification(
                    "Document Request Updated",
                    savedRequest.getResident().getFirstName() + " " + savedRequest.getResident().getLastName()
                            + " updated requirements for " + savedRequest.getDocumentName() + ".",
                    "DOCUMENT_REQUEST_UPDATED",
                    AdminNotificationService.CATEGORY_REQUESTS,
                    AdminNotificationService.TARGET_DOCUMENT_REQUEST,
                    savedRequest.getRequestId());
            DocumentRequestDTO savedDto = convertToDTO(savedRequest);
            return ResponseEntity.ok(savedDto);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error updating document request: " + e.getMessage());
        }
    }

    // NEW: Authenticated file download endpoint
    @GetMapping("/{requestId}/attachments/{attachmentId}/download")
    public ResponseEntity<Resource> downloadAttachment(
            @PathVariable Long requestId,
            @PathVariable Long attachmentId,
            HttpServletRequest request) {

        try {
            // Extract and validate JWT token
            String authHeader = request.getHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            // Here you would validate the JWT token and extract user information
            // For simplicity, we'll assume the token is valid and contains user role info
            String token = authHeader.substring(7);

            // Check if document request exists
            DocumentRequest documentRequest = documentRequestRepository.findById(requestId)
                    .orElseThrow(() -> new RuntimeException("Document request not found"));

            // Get attachment
            RequestAttachment attachment = requestAttachmentRepository.findById(attachmentId)
                    .orElseThrow(() -> new RuntimeException("Attachment not found"));

            // Verify attachment belongs to the request
            if (!attachment.getDocumentRequest().getRequestId().equals(requestId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            // Here you would implement your authorization logic:
            // - Check if user is the resident who owns this request
            // - Or if user is admin/superadmin
            // - For now, we'll allow all authenticated users (you should implement proper
            // authorization)

            // Load file
            Path filePath = Paths.get(UPLOAD_DIR, attachment.getFilePath());
            File file = filePath.toFile();

            if (!file.exists()) {
                return ResponseEntity.notFound().build();
            }

            InputStream inputStream = new FileInputStream(file);
            InputStreamResource resource = new InputStreamResource(inputStream);

            // Determine content type
            String contentType = URLConnection.guessContentTypeFromName(file.getName());
            if (contentType == null) {
                contentType = "application/octet-stream";
            }

            // Set headers for secure download
            HttpHeaders headers = new HttpHeaders();
            headers.add(HttpHeaders.CONTENT_DISPOSITION,
                    "attachment; filename=\"" + attachment.getFileName() + "\"");
            headers.add(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate");
            headers.add(HttpHeaders.PRAGMA, "no-cache");
            headers.add(HttpHeaders.EXPIRES, "0");

            return ResponseEntity.ok()
                    .headers(headers)
                    .contentLength(file.length())
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(resource);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // NEW: Get signed URL for preview (alternative approach)
    @GetMapping("/{requestId}/attachments/{attachmentId}/signed-url")
    public ResponseEntity<?> getSignedUrl(
            @PathVariable Long requestId,
            @PathVariable Long attachmentId,
            HttpServletRequest request) {

        try {
            String authHeader = request.getHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            // Implementation would generate a time-limited signed URL
            // For now, return error as this is a more complex implementation
            return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
                    .body("Signed URL feature not yet implemented");

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<String> approveDocumentRequest(@PathVariable Long id, HttpServletRequest request) {
        try {
            String authHeader = request.getHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            DocumentRequest documentRequest = documentRequestRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Document request not found"));

            documentRequest.setStatus("Approved");
            documentRequest.setUpdatedAt(java.time.LocalDateTime.now());
            DocumentRequest savedRequest = documentRequestRepository.save(documentRequest);

            notificationService.createNotification(
                    savedRequest.getResident(),
                    "Document Request Approved",
                    "Your request for '" + savedRequest.getDocumentName() + "' has been approved.",
                    "REQUEST_APPROVED",
                    null,
                    "DOCUMENT_REQUEST",
                    savedRequest.getRequestId());

            return ResponseEntity.ok("Request approved successfully");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error approving request");
        }
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<String> rejectDocumentRequest(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            HttpServletRequest request) {
        try {
            String authHeader = request.getHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            DocumentRequest documentRequest = documentRequestRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Document request not found"));

            documentRequest.setStatus("Rejected");
            if (body != null && body.get("rejectionReason") != null) {
                documentRequest.setRejectionReason(body.get("rejectionReason"));
            }
            documentRequest.setUpdatedAt(java.time.LocalDateTime.now());
            DocumentRequest savedRequest = documentRequestRepository.save(documentRequest);

            notificationService.createNotification(
                    savedRequest.getResident(),
                    "Document Request Rejected",
                    "Your request for '" + savedRequest.getDocumentName() + "' has been rejected.",
                    "REQUEST_REJECTED",
                    savedRequest.getRejectionReason(),
                    "DOCUMENT_REQUEST",
                    savedRequest.getRequestId());

            return ResponseEntity.ok("Request rejected successfully");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error rejecting request");
        }
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<String> cancelDocumentRequest(@PathVariable Long id, HttpServletRequest request) {
        try {
            String authHeader = request.getHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            DocumentRequest documentRequest = documentRequestRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Document request not found"));

            documentRequest.setStatus("Cancelled");
            documentRequest.setUpdatedAt(java.time.LocalDateTime.now());
            DocumentRequest savedRequest = documentRequestRepository.save(documentRequest);

            adminNotificationService.createNotification(
                    "Document Request Cancelled",
                    savedRequest.getResident().getFirstName() + " " + savedRequest.getResident().getLastName()
                            + " cancelled " + savedRequest.getDocumentName() + ".",
                    "DOCUMENT_REQUEST_CANCELLED",
                    AdminNotificationService.CATEGORY_REQUESTS,
                    AdminNotificationService.TARGET_DOCUMENT_REQUEST,
                    savedRequest.getRequestId());

            return ResponseEntity.ok("Request cancelled successfully");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error cancelling request");
        }
    }

    private DocumentRequestDTO convertToDTO(DocumentRequest request) {
        DocumentRequestDTO dto = new DocumentRequestDTO();
        dto.setRequestId(request.getRequestId());
        // Use relationship data - now the single source of truth
        dto.setDocumentId(request.getDocumentId());
        dto.setDocumentName(request.getDocumentName());
        dto.setResidentId(request.getResident().getResidentId());
        dto.setResidentName(request.getResident().getFirstName() + " " + request.getResident().getLastName());
        dto.setResidentFirstName(request.getResident().getFirstName());
        dto.setResidentMiddleName(request.getResident().getMiddleName());
        dto.setResidentLastName(request.getResident().getLastName());
        dto.setResidentEmail(request.getResident().getResidentEmail());
        dto.setResidentPhoneNumber(request.getResident().getPhoneNumber());
        dto.setResidentAddress(formatResidentAddress(request.getResident()));
        dto.setDetails(request.getDetails());
        dto.setStatus(request.getStatus());
        dto.setSubmittedAt(request.getSubmittedAt().toString());

        if (request.getUpdatedAt() != null) {
            dto.setUpdatedAt(request.getUpdatedAt().toString());
        }

        // Set attachments
        List<RequestAttachment> attachments = request.getAttachments();
        dto.setAttachments(attachments != null ? attachments.stream().map(this::convertAttachmentToDTO).toList() : List.of());
        dto.setAttachmentCount(attachments != null ? attachments.size() : 0);

        return dto;
    }

    private String formatResidentAddress(Resident resident) {
        return List.of(
                        resident.getAddressLine1(),
                        resident.getSitio(),
                        resident.getBarangay(),
                        resident.getCity(),
                        resident.getProvince(),
                        resident.getRegion())
                .stream()
                .filter(value -> value != null && !value.isBlank())
                .reduce((first, second) -> first + ", " + second)
                .orElse(null);
    }

    private RequestAttachment convertAttachmentToDTO(RequestAttachment attachment) {
        // For now, return the entity directly since the frontend expects this structure
        // In a proper implementation, you would create a separate RequestAttachmentDTO
        return attachment;
    }

    private DocumentRequestDTO parseJson(String dataJson) {
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            return objectMapper.readValue(dataJson, DocumentRequestDTO.class);
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse JSON data: " + e.getMessage());
        }
    }

    private DocumentRequestUpdateDTO parseUpdateJson(String dataJson) {
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            return objectMapper.readValue(dataJson, DocumentRequestUpdateDTO.class);
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse JSON data: " + e.getMessage());
        }
    }
}
