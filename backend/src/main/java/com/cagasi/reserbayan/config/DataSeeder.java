package com.cagasi.reserbayan.config;

import com.cagasi.reserbayan.entity.Admin;
import com.cagasi.reserbayan.entity.DocumentType;
import com.cagasi.reserbayan.entity.Role;
import com.cagasi.reserbayan.entity.Status;
import com.cagasi.reserbayan.repository.AdminRepository;
import com.cagasi.reserbayan.repository.DocumentTypeRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private DocumentTypeRepository documentTypeRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        if (adminRepository.findByUsername("superadmin").isEmpty()) {
            Admin superAdmin = new Admin();
            superAdmin.setUsername("superadmin");
            superAdmin.setResidentEmail("superadmin@reserbayan.gov");
            superAdmin.setPassword(passwordEncoder.encode("SuperAdmin123!"));
            superAdmin.setPlainPassword("SuperAdmin123!");
            superAdmin.setRole(Role.SUPER_ADMIN);
            superAdmin.setStatus(Status.ACTIVE);
            superAdmin.setFirstName("Super");
            superAdmin.setLastName("Admin");
            adminRepository.save(superAdmin);
            System.out.println("SuperAdmin account created.");
        }

        // Seed document types
        seedDocumentTypes();
    }

    private void seedDocumentTypes() {
        ObjectMapper objectMapper = new ObjectMapper();
        try {
            ClassPathResource resource = new ClassPathResource("data.json");
            List<Map<String, Object>> documentData = objectMapper.readValue(resource.getInputStream(),
                    new TypeReference<List<Map<String, Object>>>() {
                    });

            for (Map<String, Object> data : documentData) {
                String documentId = (String) data.get("id");
                if (documentTypeRepository.findByDocumentId(documentId).isEmpty()) {
                    DocumentType documentType = new DocumentType();
                    documentType.setDocumentId(documentId);
                    documentType.setDocumentName((String) data.get("name"));
                    documentType.setShortDescription((String) data.get("shortDescription"));
                    documentType.setImagePath((String) data.get("imagePath"));

                    @SuppressWarnings("unchecked")
                    Map<String, Object> details = (Map<String, Object>) data.get("details");
                    if (details != null) {
                        documentType.setCategory((String) details.get("category"));
                        documentType.setLongDescription((String) details.get("longDescription"));
                        documentType.setProcessingTime((String) details.get("processingTime"));
                        documentType.setPdfPath((String) details.get("pdfPath"));

                        // Convert arrays to JSON strings
                        List<String> requirements = (List<String>) details.get("requirements");
                        if (requirements != null) {
                            documentType.setRequirements(objectMapper.writeValueAsString(requirements));
                        }

                        Object hardCopySubmissionRequired = details.get("hardCopySubmissionRequired");
                        documentType.setHardCopySubmissionRequired(Boolean.parseBoolean(String.valueOf(hardCopySubmissionRequired)));
                        @SuppressWarnings("unchecked")
                        List<String> hardCopyRequirements = (List<String>) details.get("hardCopyRequirements");
                        documentType.setHardCopyRequirements(objectMapper.writeValueAsString(
                                hardCopyRequirements != null ? hardCopyRequirements : List.of()));

                        List<String> uses = (List<String>) details.get("uses");
                        if (uses != null) {
                            documentType.setUses(objectMapper.writeValueAsString(uses));
                        }

                        // Parse processingDays from processingTime
                        String processingTime = (String) details.get("processingTime");
                        if (processingTime != null) {
                            int days = parseProcessingDays(processingTime);
                            documentType.setProcessingDays(days);
                        }
                    }

                    documentType.setActive(true);
                    documentType.setDepartment(documentType.getCategory()); // or set to something else

                    documentTypeRepository.save(documentType);
                    System.out.println("Document type '" + documentId + "' seeded.");
                } else {
                    System.out.println("Document type '" + documentId + "' already exists.");
                }
            }
        } catch (IOException e) {
            System.err.println("Error seeding document types: " + e.getMessage());
        }
    }

    private int parseProcessingDays(String processingTime) {
        if (processingTime == null)
            return 0;
        processingTime = processingTime.toLowerCase();
        if (processingTime.contains("day")) {
            try {
                return Integer.parseInt(processingTime.replaceAll("\\D", ""));
            } catch (NumberFormatException e) {
                return 1; // default to 1 day
            }
        } else if (processingTime.contains("hour")) {
            return 0; // less than a day
        } else if (processingTime.contains("minute")) {
            return 0;
        }
        return 0;
    }
}
