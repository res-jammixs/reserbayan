package com.cagasi.reserbayan.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;

class DeepSeekClientTests {

    @Test
    void parsesRequirementAndIdentityReviewJson() {
        DeepSeekClient client = new DeepSeekClient(new ObjectMapper());

        DeepSeekClient.DeepSeekReview review = client.parseReview("""
                {
                  "requirements": [
                    {
                      "requirementIndex": 0,
                      "status": "WRONG_DOCUMENT",
                      "confidence": 0.82,
                      "detectedDocumentType": "Birth Certificate",
                      "explanation": "The text is a birth certificate, not a valid ID."
                    },
                    {
                      "requirementIndex": 1,
                      "status": "matched",
                      "confidence": 1.4,
                      "detectedDocumentType": "Proof of Residency",
                      "explanation": "The address and residency text are visible."
                    }
                  ],
                  "identityChecks": [
                    {
                      "fileName": "id.pdf",
                      "field": "name",
                      "extractedValue": "Maria Reyes",
                      "status": "MISMATCH",
                      "confidence": 0.91,
                      "explanation": "The visible name differs from the account."
                    }
                  ]
                }
                """);

        assertThat(review.requirements()).hasSize(2);
        assertThat(review.requirements().get(0).status()).isEqualTo("WRONG_DOCUMENT");
        assertThat(review.requirements().get(1).status()).isEqualTo("MATCHED");
        assertThat(review.requirements().get(1).confidence()).isEqualTo(1.0);
        assertThat(review.identityChecks()).singleElement().satisfies(check -> {
            assertThat(check.fileName()).isEqualTo("id.pdf");
            assertThat(check.status()).isEqualTo("MISMATCH");
        });
    }

    @Test
    void invalidDeepSeekJsonReturnsEmptyReview() {
        DeepSeekClient client = new DeepSeekClient(new ObjectMapper());

        DeepSeekClient.DeepSeekReview review = client.parseReview("not json");

        assertThat(review.requirements()).isEmpty();
        assertThat(review.identityChecks()).isEmpty();
    }
}
