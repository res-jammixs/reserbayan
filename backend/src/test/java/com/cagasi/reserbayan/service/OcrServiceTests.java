package com.cagasi.reserbayan.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayOutputStream;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

class OcrServiceTests {

    @Test
    void imageOcrReportsStaffReviewWhenAutomaticChecksAreUnavailable() {
        OcrService service = new OcrService();
        ReflectionTestUtils.setField(service, "tesseractCommand", "definitely-missing-tesseract-command");
        ReflectionTestUtils.setField(service, "timeoutSeconds", 1L);
        ReflectionTestUtils.setField(service, "onlineOcrEnabled", false);

        MockMultipartFile image = new MockMultipartFile(
                "files",
                "valid-id.png",
                "image/png",
                new byte[] { 1, 2, 3 });

        OcrService.OcrResult result = service.extractText(image);

        assertThat(result.status()).isEqualTo("OCR_UNAVAILABLE");
        assertThat(result.message()).isEqualTo("Automatic document checking is temporarily unavailable. Staff can still review this manually.");
    }

    @Test
    void readablePdfTextIsExtractedWithoutTesseract() throws Exception {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                contentStream.beginText();
                contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                contentStream.newLineAtOffset(72, 720);
                contentStream.showText("Republic of the Philippines valid identification for Ana Santos");
                contentStream.endText();
            }
            document.save(outputStream);
        }

        OcrService service = new OcrService();
        MockMultipartFile pdf = new MockMultipartFile(
                "files",
                "id.pdf",
                "application/pdf",
                outputStream.toByteArray());

        OcrService.OcrResult result = service.extractText(pdf);

        assertThat(result.status()).isEqualTo("READABLE");
        assertThat(result.text()).contains("Republic of the Philippines");
    }
}
