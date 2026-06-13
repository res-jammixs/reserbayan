package com.cagasi.reserbayan.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import com.cagasi.reserbayan.dto.AiAnalysisDTO;
import com.cagasi.reserbayan.dto.AiAttachmentMetadataDTO;
import com.cagasi.reserbayan.entity.DocumentType;
import com.cagasi.reserbayan.entity.Resident;
import com.cagasi.reserbayan.repository.DocumentRequestAnalysisRepository;
import com.cagasi.reserbayan.repository.DocumentRequestRepository;
import com.cagasi.reserbayan.repository.RequestAttachmentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
class AiRequirementAnalysisServiceTests {

    @Mock
    private DocumentRequestAnalysisRepository analysisRepository;

    @Mock
    private DocumentRequestRepository documentRequestRepository;

    @Mock
    private RequestAttachmentRepository attachmentRepository;

    @Mock
    private OcrService ocrService;

    @Mock
    private DeepSeekClient deepSeekClient;

    private AiRequirementAnalysisService service;

    @BeforeEach
    void setUp() {
        service = new AiRequirementAnalysisService(
                analysisRepository,
                documentRequestRepository,
                attachmentRepository,
                new ObjectMapper(),
                ocrService,
                deepSeekClient);
    }

    @Test
    void deepSeekFailureFallsBackToOcrRequirementAndIdentityHeuristics() {
        DocumentType documentType = new DocumentType();
        documentType.setDocumentName("Barangay ID Application");
        documentType.setRequirements("[\"Valid ID\"]");

        Resident resident = new Resident();
        resident.setFirstName("Ana");
        resident.setMiddleName("M");
        resident.setLastName("Santos");
        resident.setBirthdate(LocalDate.of(1998, 5, 9));
        resident.setGender("Female");
        resident.setBarangay("Barangay Uno");
        resident.setCity("Cagayan de Oro");

        MockMultipartFile file = new MockMultipartFile(
                "files",
                "ana-id.pdf",
                "application/pdf",
                "id".getBytes());
        AiAttachmentMetadataDTO metadata = new AiAttachmentMetadataDTO();
        metadata.setUploadGroup("REQUIREMENT");
        metadata.setRequirementIndex(0);
        metadata.setRequirementLabel("Valid ID");

        when(ocrService.extractText(file)).thenReturn(OcrService.OcrResult.success("""
                Republic of the Philippines
                Philippine Identification
                ID No 123456
                Ana M Santos
                Female
                Barangay Uno Cagayan de Oro
                1998
                """));
        when(deepSeekClient.review(any())).thenReturn(Optional.empty());

        AiAnalysisDTO analysis = service.analyzePreview(documentType, resident, List.of(file), List.of(metadata));

        assertThat(analysis.getOverallStatus()).isEqualTo("COMPLETE");
        assertThat(analysis.getRequirements()).singleElement().satisfies(requirement -> {
            assertThat(requirement.getStatus()).isEqualTo("MATCHED");
            assertThat(requirement.getReviewSource()).isEqualTo("OCR_HEURISTIC");
            assertThat(requirement.getMatchedFileNames()).containsExactly("ana-id.pdf");
        });
        assertThat(analysis.getIdentityChecks())
                .anySatisfy(check -> {
                    assertThat(check.getField()).isEqualTo("name");
                    assertThat(check.getStatus()).isEqualTo("MATCH");
                })
                .anySatisfy(check -> {
                    assertThat(check.getField()).isEqualTo("birthdate");
                    assertThat(check.getStatus()).isEqualTo("MATCH");
                });
    }

    @Test
    void businessPlanUploadedForBuildingPlansIsReportedAsWrongDocument() {
        DocumentType documentType = new DocumentType();
        documentType.setDocumentName("Building Permit Clearance");
        documentType.setRequirements("[\"Building plans\"]");

        MockMultipartFile file = new MockMultipartFile(
                "files",
                "business-plan.png",
                "image/png",
                "image".getBytes());
        AiAttachmentMetadataDTO metadata = new AiAttachmentMetadataDTO();
        metadata.setUploadGroup("REQUIREMENT");
        metadata.setRequirementIndex(0);
        metadata.setRequirementLabel("Building plans");

        when(ocrService.extractText(file)).thenReturn(OcrService.OcrResult.success("""
                BUSINESS PLAN
                Our taste of success
                Executive summary
                Market analysis
                Financial plan
                """));
        when(deepSeekClient.review(any())).thenReturn(Optional.empty());

        AiAnalysisDTO analysis = service.analyzePreview(documentType, null, List.of(file), List.of(metadata));

        assertThat(analysis.getOverallStatus()).isEqualTo("WRONG_DOCUMENT");
        assertThat(analysis.getRequirements()).singleElement().satisfies(requirement -> {
            assertThat(requirement.getStatus()).isEqualTo("WRONG_DOCUMENT");
            assertThat(requirement.getExplanation()).contains("Business Plan");
            assertThat(requirement.getExplanation()).contains("Building plans");
            assertThat(requirement.getExplanation()).doesNotContain("uploaded text");
        });
    }
}
