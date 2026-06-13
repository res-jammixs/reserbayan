package com.cagasi.reserbayan.service;

import java.time.LocalDate;
import java.time.Period;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.cagasi.reserbayan.entity.DocumentType;
import com.cagasi.reserbayan.entity.Resident;
import com.cagasi.reserbayan.repository.DocumentTypeRepository;
import com.cagasi.reserbayan.repository.ResidentRepository;

@Service
public class DocumentRecommendationService {

    private final DocumentTypeRepository documentTypeRepository;
    private final ResidentRepository residentRepository;

    public DocumentRecommendationService(DocumentTypeRepository documentTypeRepository,
            ResidentRepository residentRepository) {
        this.documentTypeRepository = documentTypeRepository;
        this.residentRepository = residentRepository;
    }

    public List<RecommendationResult> recommend(Long residentId) {
        Optional<Resident> resident = residentId == null ? Optional.empty() : residentRepository.findById(residentId);
        Integer age = resident.map(Resident::getBirthdate)
                .map(this::calculateAge)
                .orElse(null);

        return documentTypeRepository.findAll().stream()
                .filter(DocumentType::isActive)
                .map(documentType -> score(documentType, age))
                .sorted(Comparator.comparingInt(RecommendationResult::score).reversed()
                        .thenComparing(result -> result.documentType().getDocumentName()))
                .limit(6)
                .toList();
    }

    private RecommendationResult score(DocumentType documentType, Integer age) {
        String haystack = String.join(" ",
                value(documentType.getDocumentName()),
                value(documentType.getShortDescription()),
                value(documentType.getCategory()),
                value(documentType.getLongDescription()),
                value(documentType.getRequirements()),
                value(documentType.getUses()))
                .toLowerCase(Locale.ROOT);

        int score = 10;
        String reason = "Commonly requested barangay document";

        if (age == null) {
            score += keywordScore(haystack, "certificate", "clearance", "residency", "barangay");
            return new RecommendationResult(documentType, score, reason);
        }

        if (age >= 5 && age <= 17) {
            score += keywordScore(haystack, "school", "scholarship", "enrollment", "indigency", "residency", "low income");
            reason = containsAny(haystack, "indigency", "low income")
                    ? "Suggested for school assistance"
                    : "Useful for student requirements";
        } else if (age >= 18 && age <= 20) {
            score += keywordScore(haystack, "first-time", "job seeker", "employment", "good conduct", "clearance", "residency", "indigency");
            reason = containsAny(haystack, "first-time", "job seeker")
                    ? "Useful for first job requirements"
                    : "Suggested for young adult needs";
        } else if (age >= 60) {
            score += keywordScore(haystack, "indigency", "low income", "medical", "assistance", "residency", "clearance", "certificate");
            reason = containsAny(haystack, "medical", "assistance", "indigency", "low income")
                    ? "Suggested for assistance needs"
                    : "Useful for senior resident records";
        } else {
            score += keywordScore(haystack, "business", "permit", "property", "building", "construction", "employment", "clearance", "residency");
            reason = containsAny(haystack, "business", "permit")
                    ? "Suggested for business transactions"
                    : "Useful for adult resident transactions";
        }

        if (containsAny(haystack, "duplicate copy", "-2")) {
            score -= 8;
        }

        return new RecommendationResult(documentType, Math.max(score, 1), reason);
    }

    private int calculateAge(LocalDate birthdate) {
        return Period.between(birthdate, LocalDate.now()).getYears();
    }

    private int keywordScore(String haystack, String... keywords) {
        int score = 0;
        for (String keyword : keywords) {
            if (haystack.contains(keyword)) {
                score += 12;
            }
        }
        return score;
    }

    private boolean containsAny(String haystack, String... keywords) {
        for (String keyword : keywords) {
            if (haystack.contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    private String value(String text) {
        return text == null ? "" : text;
    }

    public record RecommendationResult(DocumentType documentType, int score, String reason) {
    }
}
