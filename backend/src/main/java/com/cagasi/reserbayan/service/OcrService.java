package com.cagasi.reserbayan.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.cagasi.reserbayan.entity.RequestAttachment;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class OcrService {

    private static final String AUTOMATIC_CHECK_UNAVAILABLE_MESSAGE =
            "Automatic document checking is temporarily unavailable. Staff can still review this manually.";
    private static final String CLEARER_FILE_MESSAGE =
            "We could not clearly read this document. Please upload a clearer file if possible.";

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .build();

    @Value("${app.ocr.tesseract-command:tesseract}")
    private String tesseractCommand;

    @Value("${app.ocr.timeout-seconds:15}")
    private long timeoutSeconds;

    @Value("${app.ocr.online.enabled:true}")
    private boolean onlineOcrEnabled;

    @Value("${app.ocr.online.url:https://api.ocr.space/parse/image}")
    private String onlineOcrUrl;

    @Value("${OCR_SPACE_API_KEY:${app.ocr.online.api-key:helloworld}}")
    private String onlineOcrApiKey;

    @Value("${app.ocr.online.language:eng}")
    private String onlineOcrLanguage;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    public OcrResult extractText(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return OcrResult.unreadable("The file appears empty.");
        }

        String contentType = file.getContentType();
        String fileName = file.getOriginalFilename();
        try {
            if (isPdf(contentType, fileName)) {
                return extractPdfText(file.getBytes(), fileName, contentType);
            }
            if (isImage(contentType, fileName)) {
                String suffix = extensionFor(fileName);
                Path tempFile = Files.createTempFile("reserbayan-ocr-", suffix);
                try {
                    file.transferTo(tempFile);
                    return extractImageText(tempFile, fileName, contentType);
                } finally {
                    Files.deleteIfExists(tempFile);
                }
            }
            return OcrResult.unsupported("This file type needs staff review.");
        } catch (Exception e) {
            return OcrResult.unavailable(AUTOMATIC_CHECK_UNAVAILABLE_MESSAGE);
        }
    }

    public OcrResult extractText(RequestAttachment attachment) {
        if (attachment == null || attachment.getFilePath() == null) {
            return OcrResult.unreadable("The attachment file is missing.");
        }

        Path filePath = Paths.get(uploadDir).toAbsolutePath().normalize().resolve(attachment.getFilePath());
        if (!Files.exists(filePath)) {
            return OcrResult.unreadable("The uploaded file could not be found.");
        }

        try {
            if (isPdf(attachment.getFileType(), attachment.getFileName())) {
                return extractPdfText(Files.readAllBytes(filePath), attachment.getFileName(), attachment.getFileType());
            }
            if (isImage(attachment.getFileType(), attachment.getFileName())) {
                return extractImageText(filePath, attachment.getFileName(), attachment.getFileType());
            }
            return OcrResult.unsupported("This file type needs staff review.");
        } catch (Exception e) {
            return OcrResult.unavailable(AUTOMATIC_CHECK_UNAVAILABLE_MESSAGE);
        }
    }

    private OcrResult extractPdfText(byte[] bytes, String fileName, String contentType) throws IOException {
        try (PDDocument document = Loader.loadPDF(bytes)) {
            String text = new PDFTextStripper().getText(document);
            if (!isBlankOcr(text)) {
                return OcrResult.success(text);
            }
        } catch (IOException e) {
            OcrResult onlineResult = extractOnlineText(bytes, fileName, contentType);
            return onlineResult != null ? onlineResult : OcrResult.unreadable(CLEARER_FILE_MESSAGE);
        }

        OcrResult onlineResult = extractOnlineText(bytes, fileName, contentType);
        return onlineResult != null ? onlineResult : OcrResult.unreadable(CLEARER_FILE_MESSAGE);
    }

    private OcrResult extractImageText(Path imagePath, String fileName, String contentType) throws IOException, InterruptedException {
        byte[] bytes = Files.readAllBytes(imagePath);
        OcrResult onlineResult = extractOnlineText(bytes, fileName, contentType);
        if (onlineResult != null && "READABLE".equals(onlineResult.status())) {
            return onlineResult;
        }

        ProcessBuilder processBuilder = new ProcessBuilder(tesseractCommand, imagePath.toString(), "stdout");
        processBuilder.redirectErrorStream(true);
        Process process;
        try {
            process = processBuilder.start();
        } catch (IOException e) {
            return onlineResult != null ? onlineResult : OcrResult.unavailable(AUTOMATIC_CHECK_UNAVAILABLE_MESSAGE);
        }
        boolean finished = process.waitFor(Duration.ofSeconds(timeoutSeconds).toMillis(), TimeUnit.MILLISECONDS);
        if (!finished) {
            process.destroyForcibly();
            return onlineResult != null ? onlineResult : OcrResult.unavailable(AUTOMATIC_CHECK_UNAVAILABLE_MESSAGE);
        }

        String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        if (process.exitValue() != 0) {
            return onlineResult != null ? onlineResult : OcrResult.unavailable(AUTOMATIC_CHECK_UNAVAILABLE_MESSAGE);
        }
        if (isBlankOcr(output)) {
            return onlineResult != null ? onlineResult : OcrResult.unreadable(CLEARER_FILE_MESSAGE);
        }
        return OcrResult.success(output);
    }

    private OcrResult extractOnlineText(byte[] bytes, String fileName, String contentType) {
        if (!onlineOcrEnabled || bytes == null || bytes.length == 0 || onlineOcrUrl == null || onlineOcrUrl.isBlank()) {
            return null;
        }

        try {
            String boundary = "----ReserBayanOCR" + UUID.randomUUID();
            byte[] body = buildMultipartBody(boundary, bytes, fileName, contentType);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(onlineOcrUrl))
                    .timeout(Duration.ofSeconds(timeoutSeconds))
                    .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                    .POST(HttpRequest.BodyPublishers.ofByteArray(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return OcrResult.unavailable(AUTOMATIC_CHECK_UNAVAILABLE_MESSAGE);
            }

            JsonNode root = objectMapper.readTree(response.body());
            StringBuilder text = new StringBuilder();
            for (JsonNode result : root.path("ParsedResults")) {
                String parsedText = result.path("ParsedText").asText("");
                if (!parsedText.isBlank()) {
                    text.append(parsedText).append('\n');
                }
            }
            if (!isBlankOcr(text.toString())) {
                return OcrResult.success(text.toString());
            }
            if (root.path("IsErroredOnProcessing").asBoolean(false)) {
                return OcrResult.unavailable(AUTOMATIC_CHECK_UNAVAILABLE_MESSAGE);
            }
            return OcrResult.unreadable(CLEARER_FILE_MESSAGE);
        } catch (Exception e) {
            return OcrResult.unavailable(AUTOMATIC_CHECK_UNAVAILABLE_MESSAGE);
        }
    }

    private byte[] buildMultipartBody(String boundary, byte[] fileBytes, String fileName, String contentType) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        writeField(output, boundary, "apikey", onlineOcrApiKey == null || onlineOcrApiKey.isBlank() ? "helloworld" : onlineOcrApiKey);
        writeField(output, boundary, "language", onlineOcrLanguage == null || onlineOcrLanguage.isBlank() ? "eng" : onlineOcrLanguage);
        writeField(output, boundary, "isOverlayRequired", "false");
        writeField(output, boundary, "detectOrientation", "true");
        writeField(output, boundary, "scale", "true");
        writeField(output, boundary, "OCREngine", "2");

        String safeFileName = fileName == null || fileName.isBlank() ? "upload" : fileName;
        String safeContentType = contentType == null || contentType.isBlank() ? "application/octet-stream" : contentType;
        output.write(("--" + boundary + "\r\n").getBytes(StandardCharsets.UTF_8));
        output.write(("Content-Disposition: form-data; name=\"file\"; filename=\"" + safeFileName.replace("\"", "") + "\"\r\n")
                .getBytes(StandardCharsets.UTF_8));
        output.write(("Content-Type: " + safeContentType + "\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        output.write(fileBytes);
        output.write("\r\n".getBytes(StandardCharsets.UTF_8));
        output.write(("--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
        return output.toByteArray();
    }

    private void writeField(ByteArrayOutputStream output, String boundary, String name, String value) throws IOException {
        output.write(("--" + boundary + "\r\n").getBytes(StandardCharsets.UTF_8));
        output.write(("Content-Disposition: form-data; name=\"" + name + "\"\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        output.write((value == null ? "" : value).getBytes(StandardCharsets.UTF_8));
        output.write("\r\n".getBytes(StandardCharsets.UTF_8));
    }

    private boolean isBlankOcr(String text) {
        if (text == null) {
            return true;
        }
        String normalized = text.replaceAll("[^A-Za-z0-9]", "").trim();
        return normalized.length() < 12;
    }

    private boolean isPdf(String contentType, String fileName) {
        String type = contentType == null ? "" : contentType.toLowerCase(Locale.ROOT);
        String name = fileName == null ? "" : fileName.toLowerCase(Locale.ROOT);
        return type.equals("application/pdf") || name.endsWith(".pdf");
    }

    private boolean isImage(String contentType, String fileName) {
        String type = contentType == null ? "" : contentType.toLowerCase(Locale.ROOT);
        String name = fileName == null ? "" : fileName.toLowerCase(Locale.ROOT);
        return type.startsWith("image/")
                || name.endsWith(".jpg")
                || name.endsWith(".jpeg")
                || name.endsWith(".png")
                || name.endsWith(".webp")
                || name.endsWith(".tif")
                || name.endsWith(".tiff")
                || name.endsWith(".jfif");
    }

    private String extensionFor(String fileName) {
        if (fileName == null || !fileName.contains(".")) {
            return ".img";
        }
        String extension = fileName.substring(fileName.lastIndexOf("."));
        return extension.length() > 8 ? ".img" : extension;
    }

    public record OcrResult(String status, String text, String message) {
        public static OcrResult success(String text) {
            return new OcrResult("READABLE", text == null ? "" : text, null);
        }

        public static OcrResult unreadable(String message) {
            return new OcrResult("UNREADABLE", "", message);
        }

        public static OcrResult unavailable(String message) {
            return new OcrResult("OCR_UNAVAILABLE", "", message);
        }

        public static OcrResult unsupported(String message) {
            return new OcrResult("UNSUPPORTED", "", message);
        }
    }
}
