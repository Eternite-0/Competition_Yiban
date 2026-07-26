package com.etsaion.service.ai;

import cn.hutool.core.util.StrUtil;
import com.etsaion.exception.BusinessException;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.IDN;
import java.net.InetAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class DocumentContentService {
    private static final int MAX_URL_BYTES = 15 * 1024 * 1024;
    private static final int MAX_RENDERED_PDF_PAGES = 3;
    private static final int MIN_USEFUL_PDF_TEXT_LENGTH = 120;
    private static final String USER_AGENT = "Etsaion-AI-Crawler/1.0 (+https://example.edu)";

    public String readMultipartFile(MultipartFile file) {
        return readMultipartFileDetailed(file).getText();
    }

    public ExtractedDocument readMultipartFileDetailed(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("上传文件不能为空");
        }
        try {
            return readTextDetailed(file.getOriginalFilename(), file.getBytes())
                    .withSource(file.getOriginalFilename(), file.getOriginalFilename());
        } catch (IOException e) {
            throw new BusinessException("读取上传文件失败");
        }
    }

    public String readText(String fileName, byte[] bytes) {
        return readTextDetailed(fileName, bytes).getText();
    }

    public ExtractedDocument readTextDetailed(String fileName, byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            throw new BusinessException("文档内容为空");
        }
        String name = fileName == null ? "" : fileName.toLowerCase(Locale.ROOT);
        if (isImage(name)) {
            return ExtractedDocument.empty()
                    .addImage(toDataUrl(bytes, contentTypeForImage(name)))
                    .addWarning("image_only_file")
                    .withSource(fileName, fileName);
        }
        if (name.endsWith(".pdf")) {
            return readPdf(bytes).withSource(fileName, fileName);
        }
        if (name.endsWith(".docx")) {
            return ExtractedDocument.text(readDocx(bytes)).withSource(fileName, fileName);
        }
        if (name.endsWith(".html") || name.endsWith(".htm")) {
            return parseHtml(new String(bytes, StandardCharsets.UTF_8), fileName)
                    .withSource(fileName, fileName);
        }
        return ExtractedDocument.text(new String(bytes, StandardCharsets.UTF_8)).withSource(fileName, fileName);
    }

    public String readUrl(String url) {
        return readUrlDetailed(url).getText();
    }

    public ExtractedDocument readUrlDetailed(String url) {
        URI uri = parsePublicHttpUri(url);
        FetchedContent fetched = fetch(uri);
        String finalUrl = fetched.finalUri().toString();
        String lowerUrl = finalUrl.toLowerCase(Locale.ROOT);
        String contentType = fetched.contentType().toLowerCase(Locale.ROOT);

        ExtractedDocument document;
        if (contentType.contains("pdf") || lowerUrl.endsWith(".pdf")) {
            document = readPdf(fetched.bytes());
        } else if (contentType.contains("wordprocessingml") || lowerUrl.endsWith(".docx")) {
            document = ExtractedDocument.text(readDocx(fetched.bytes()));
        } else if (contentType.startsWith("image/")) {
            document = ExtractedDocument.empty()
                    .addImage(toDataUrl(fetched.bytes(), contentType.split(";")[0]))
                    .addWarning("image_only_url");
        } else {
            Charset charset = charsetFromContentType(fetched.contentType()).orElse(StandardCharsets.UTF_8);
            document = parseHtml(new String(fetched.bytes(), charset), finalUrl);
        }
        return document.withSource(document.getSourceTitle(), finalUrl);
    }

    private FetchedContent fetch(URI uri) {
        try {
            HttpRequest request = HttpRequest.newBuilder(uri)
                    .timeout(Duration.ofSeconds(20))
                    .header("User-Agent", USER_AGENT)
                    .header("Accept", "text/html,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*;q=0.8,*/*;q=0.5")
                    .GET()
                    .build();
            HttpResponse<byte[]> response = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .followRedirects(HttpClient.Redirect.NORMAL)
                    .build()
                    .send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new BusinessException("读取 URL 失败，HTTP " + response.statusCode());
            }
            byte[] bytes = response.body();
            if (bytes.length > MAX_URL_BYTES) {
                throw new BusinessException("URL 内容超过 15MB，已停止抓取");
            }
            validatePublicHost(response.uri());
            String contentType = response.headers().firstValue("Content-Type").orElse("");
            return new FetchedContent(response.uri(), contentType, bytes);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException("读取 URL 失败：" + e.getMessage());
        }
    }

    private ExtractedDocument parseHtml(String html, String baseUri) {
        Document doc = Jsoup.parse(html == null ? "" : html, baseUri == null ? "" : baseUri);
        doc.select("script,style,noscript,svg,canvas,iframe").remove();

        String title = firstNonBlank(
                attr(doc, "meta[property=og:title]", "content"),
                attr(doc, "meta[name=twitter:title]", "content"),
                doc.title(),
                baseUri);

        StringBuilder text = new StringBuilder();
        appendLine(text, "来源标题：" + title);
        appendLine(text, metaLine(doc, "发布时间", "meta[property=article:published_time],meta[name=publishdate],meta[name=PubDate],meta[name=date]"));
        appendLine(text, metaLine(doc, "摘要", "meta[name=description],meta[property=og:description]"));
        appendLine(text, visibleMainText(doc));

        ExtractedDocument result = ExtractedDocument.text(text.toString()).withSource(title, baseUri);
        collectUsefulLinks(doc, result);
        if (result.getText().length() < 300 && doc.select("script").size() > 4) {
            result.addWarning("possible_dynamic_page");
        }
        return result;
    }

    private void collectUsefulLinks(Document doc, ExtractedDocument result) {
        Elements links = doc.select("a[href]");
        int attachmentCount = 0;
        int detailCount = 0;
        StringBuilder attachmentText = new StringBuilder();
        StringBuilder detailText = new StringBuilder();
        // Score candidates so list pages (赛氪/官网首页)能多发现详情链接
        List<ScoredLink> scored = new ArrayList<>();
        for (Element link : links) {
            String href = link.absUrl("href");
            String label = StrUtil.blankToDefault(link.text(), "").trim();
            if (StrUtil.isBlank(href) || href.startsWith("javascript:") || href.startsWith("mailto:")
                    || href.startsWith("#") || href.startsWith("tel:")) {
                continue;
            }
            String lower = (href + " " + label).toLowerCase(Locale.ROOT);
            if (isAttachment(lower) && attachmentCount < 12) {
                attachmentCount++;
                result.addLink(href);
                appendLine(attachmentText, attachmentCount + ". " + (StrUtil.blankToDefault(label, href)) + " " + href);
                continue;
            }
            int score = competitionLinkScore(href, label);
            if (score > 0) {
                scored.add(new ScoredLink(href, label, score));
            }
        }
        scored.sort((a, b) -> Integer.compare(b.score, a.score));
        for (ScoredLink item : scored) {
            if (detailCount >= 40) {
                break;
            }
            if (result.getLinks().contains(item.href)) {
                continue;
            }
            detailCount++;
            result.addLink(item.href);
            appendLine(detailText, detailCount + ". "
                    + (StrUtil.blankToDefault(item.label, item.href)) + " " + item.href);
        }
        if (attachmentText.length() > 0) {
            result.appendText("\n附件链接：\n" + attachmentText);
        }
        if (detailText.length() > 0) {
            result.appendText("\n可能的详情页链接：\n" + detailText);
        }
    }

    /**
     * 公开：从已解析页面取出适合继续爬取的赛事相关链接（按相关度排序）。
     */
    public List<String> rankCompetitionLinks(ExtractedDocument document, int limit) {
        if (document == null || document.getLinks() == null || document.getLinks().isEmpty()) {
            return List.of();
        }
        int cap = Math.max(1, Math.min(limit, 50));
        List<String> links = document.getLinks();
        // links 已在 collect 时按分数大致排序；这里再截断
        return links.stream().limit(cap).collect(Collectors.toList());
    }

    private int competitionLinkScore(String href, String label) {
        String lowerHref = StrUtil.blankToDefault(href, "").toLowerCase(Locale.ROOT);
        String lowerLabel = StrUtil.blankToDefault(label, "").toLowerCase(Locale.ROOT);
        String combined = lowerHref + " " + lowerLabel;
        if (combined.contains("login") || combined.contains("register") || combined.contains("signup")
                || combined.contains("about") || combined.contains("contact") || combined.contains("privacy")
                || combined.contains("javascript") || label.length() > 80) {
            return 0;
        }
        int score = 0;
        if (looksLikeCompetitionDetail(combined)) {
            score += 5;
        }
        String[] strong = {"竞赛", "大赛", "比赛", "挑战赛", "hackathon", "contest", "competition",
                "challenge", "报名", "赛项", "赛道", "国赛", "省赛", "蓝桥", "挑战杯", "建模", "电赛"};
        for (String word : strong) {
            if (combined.contains(word.toLowerCase(Locale.ROOT))) {
                score += 3;
            }
        }
        if (lowerHref.contains("/contest") || lowerHref.contains("/competition")
                || lowerHref.contains("/contest/") || lowerHref.contains("dasai")
                || lowerHref.contains("saikr") || lowerHref.contains("/news/")
                || lowerHref.contains("/notice") || lowerHref.contains("article")) {
            score += 2;
        }
        if (label.length() >= 4 && label.length() <= 40) {
            score += 1;
        }
        return score;
    }

    private static final class ScoredLink {
        private final String href;
        private final String label;
        private final int score;

        private ScoredLink(String href, String label, int score) {
            this.href = href;
            this.label = label;
            this.score = score;
        }
    }

    private ExtractedDocument readPdf(byte[] bytes) {
        try (PDDocument doc = PDDocument.load(bytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(doc);
            ExtractedDocument result = ExtractedDocument.text(text);
            if (StrUtil.blankToDefault(text, "").trim().length() < MIN_USEFUL_PDF_TEXT_LENGTH) {
                result.addWarning("pdf_scan_image_fallback");
                PDFRenderer renderer = new PDFRenderer(doc);
                int pages = Math.min(doc.getNumberOfPages(), MAX_RENDERED_PDF_PAGES);
                for (int i = 0; i < pages; i++) {
                    BufferedImage image = renderer.renderImageWithDPI(i, 150, ImageType.RGB);
                    ByteArrayOutputStream out = new ByteArrayOutputStream();
                    ImageIO.write(image, "png", out);
                    result.addImage(toDataUrl(out.toByteArray(), "image/png"));
                }
            }
            return result;
        } catch (IOException e) {
            throw new BusinessException("读取 PDF 文件失败");
        }
    }

    private String readDocx(byte[] bytes) {
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            return doc.getParagraphs().stream()
                    .map(XWPFParagraph::getText)
                    .filter(text -> text != null && !text.isBlank())
                    .collect(Collectors.joining("\n"));
        } catch (IOException e) {
            throw new BusinessException("读取 DOCX 文件失败");
        }
    }

    private URI parsePublicHttpUri(String url) {
        try {
            URI uri = URI.create(url == null ? "" : url.trim());
            String scheme = uri.getScheme();
            if (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme)) {
                throw new BusinessException("仅支持 HTTP 或 HTTPS 公开地址");
            }
            validatePublicHost(uri);
            return uri;
        } catch (IllegalArgumentException e) {
            throw new BusinessException("URL 格式不正确");
        }
    }

    private void validatePublicHost(URI uri) {
        String host = uri.getHost();
        if (StrUtil.isBlank(host)) {
            throw new BusinessException("URL 缺少有效域名");
        }
        String asciiHost = IDN.toASCII(host);
        if ("localhost".equalsIgnoreCase(asciiHost)) {
            throw new BusinessException("不允许抓取本机或内网地址");
        }
        try {
            for (InetAddress address : InetAddress.getAllByName(asciiHost)) {
                if (address.isAnyLocalAddress()
                        || address.isLoopbackAddress()
                        || address.isLinkLocalAddress()
                        || address.isSiteLocalAddress()
                        || address.isMulticastAddress()) {
                    throw new BusinessException("不允许抓取本机或内网地址");
                }
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException("URL 域名解析失败");
        }
    }

    private Optional<Charset> charsetFromContentType(String contentType) {
        if (StrUtil.isBlank(contentType)) {
            return Optional.empty();
        }
        for (String part : contentType.split(";")) {
            String trimmed = part.trim();
            if (trimmed.toLowerCase(Locale.ROOT).startsWith("charset=")) {
                try {
                    return Optional.of(Charset.forName(trimmed.substring("charset=".length()).trim()));
                } catch (Exception ignored) {
                    return Optional.empty();
                }
            }
        }
        return Optional.empty();
    }

    private String visibleMainText(Document doc) {
        Element main = firstElement(doc, "main,article,.article,.content,.notice,.news-detail,#content,#main");
        String text = main != null ? main.text() : doc.body() != null ? doc.body().text() : "";
        return text.replaceAll("\\s+", " ").trim();
    }

    private Element firstElement(Document doc, String selector) {
        Elements elements = doc.select(selector);
        return elements.isEmpty() ? null : elements.first();
    }

    private String metaLine(Document doc, String label, String selector) {
        String value = attr(doc, selector, "content");
        return StrUtil.isBlank(value) ? "" : label + "：" + value;
    }

    private String attr(Document doc, String selector, String attr) {
        Element element = firstElement(doc, selector);
        return element == null ? "" : element.attr(attr);
    }

    private void appendLine(StringBuilder builder, String value) {
        if (StrUtil.isBlank(value)) {
            return;
        }
        builder.append(value.trim()).append('\n');
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (StrUtil.isNotBlank(value)) {
                return value.trim();
            }
        }
        return "";
    }

    private boolean isImage(String name) {
        return name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg")
                || name.endsWith(".webp") || name.endsWith(".gif");
    }

    private boolean isAttachment(String value) {
        return value.contains(".pdf") || value.contains(".docx") || value.contains(".doc");
    }

    private boolean looksLikeCompetitionDetail(String value) {
        return value.contains("competition") || value.contains("contest") || value.contains("challenge")
                || value.contains("hackathon") || value.contains("竞赛") || value.contains("赛事")
                || value.contains("比赛") || value.contains("挑战赛") || value.contains("报名")
                || value.contains("大赛") || value.contains("国赛") || value.contains("省赛")
                || value.contains("选拔") || value.contains("赛项") || value.contains("通知");
    }

    private String contentTypeForImage(String name) {
        if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
        if (name.endsWith(".webp")) return "image/webp";
        if (name.endsWith(".gif")) return "image/gif";
        return "image/png";
    }

    private String toDataUrl(byte[] bytes, String contentType) {
        return "data:" + StrUtil.blankToDefault(contentType, "application/octet-stream")
                + ";base64," + Base64.getEncoder().encodeToString(bytes);
    }

    private record FetchedContent(URI finalUri, String contentType, byte[] bytes) {
    }

    public static class ExtractedDocument {
        private String sourceTitle;
        private String sourceUrl;
        private String text;
        private final List<String> imageDataUrls = new ArrayList<>();
        private final List<String> links = new ArrayList<>();
        private final List<String> warnings = new ArrayList<>();

        public static ExtractedDocument empty() {
            return new ExtractedDocument();
        }

        public static ExtractedDocument text(String text) {
            ExtractedDocument document = new ExtractedDocument();
            document.text = StrUtil.blankToDefault(text, "");
            return document;
        }

        public ExtractedDocument withSource(String sourceTitle, String sourceUrl) {
            if (StrUtil.isNotBlank(sourceTitle)) {
                this.sourceTitle = sourceTitle;
            }
            if (StrUtil.isNotBlank(sourceUrl)) {
                this.sourceUrl = sourceUrl;
            }
            return this;
        }

        public ExtractedDocument addImage(String dataUrl) {
            if (StrUtil.isNotBlank(dataUrl)) {
                imageDataUrls.add(dataUrl);
            }
            return this;
        }

        public ExtractedDocument addLink(String link) {
            if (StrUtil.isNotBlank(link) && !links.contains(link)) {
                links.add(link);
            }
            return this;
        }

        public ExtractedDocument addWarning(String warning) {
            if (StrUtil.isNotBlank(warning) && !warnings.contains(warning)) {
                warnings.add(warning);
            }
            return this;
        }

        public void appendText(String extra) {
            if (StrUtil.isBlank(extra)) {
                return;
            }
            this.text = StrUtil.blankToDefault(this.text, "") + extra;
        }

        public String getSourceTitle() {
            return sourceTitle;
        }

        public String getSourceUrl() {
            return sourceUrl;
        }

        public String getText() {
            return StrUtil.blankToDefault(text, "");
        }

        public List<String> getImageDataUrls() {
            return imageDataUrls;
        }

        public List<String> getLinks() {
            return links;
        }

        public List<String> getWarnings() {
            return warnings;
        }
    }
}
