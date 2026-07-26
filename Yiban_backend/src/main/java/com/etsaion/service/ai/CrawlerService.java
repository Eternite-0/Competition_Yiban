package com.etsaion.service.ai;

import cn.hutool.core.util.StrUtil;
import com.etsaion.entity.CompetitionSource;
import com.etsaion.exception.BusinessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Queue;
import java.util.Set;

/**
 * 赛事来源采集：入口页 + 详情页多链跟进，尽量产出多条草稿。
 * 不依赖 AI 也能用规则抽取；有 AI 时由草稿服务自动增强。
 */
@Service
public class CrawlerService {
    private static final Logger log = LoggerFactory.getLogger(CrawlerService.class);

    @Autowired
    private DocumentContentService documentContentService;

    @Autowired
    private AiCompetitionDraftService aiCompetitionDraftService;

    public int crawlSource(CompetitionSource source) {
        if (source == null) {
            throw new BusinessException("赛事来源不存在");
        }
        if (source.getEnabled() != null && source.getEnabled() == 0) {
            throw new BusinessException("禁用来源不会被采集");
        }
        if (StrUtil.isBlank(source.getUrl())) {
            throw new BusinessException("来源 URL 为空");
        }

        int maxPages = source.getMaxPages() == null ? 8 : Math.min(Math.max(source.getMaxPages(), 1), 20);
        // depth=0 仍至少发现一层详情链接，否则列表站几乎采不到赛事
        int depth = source.getCrawlDepth() == null ? 1 : Math.min(Math.max(source.getCrawlDepth(), 0), 2);
        if (depth == 0) {
            depth = 1;
        }

        String entryUrl = source.getUrl().trim();
        Set<String> visited = new HashSet<>();
        Queue<CrawlNode> queue = new ArrayDeque<>();
        queue.add(new CrawlNode(entryUrl, 0));

        int pagesFetched = 0;
        int created = 0;
        List<String> errors = new ArrayList<>();

        while (!queue.isEmpty() && pagesFetched < maxPages) {
            CrawlNode node = queue.poll();
            if (node == null || StrUtil.isBlank(node.url)) {
                continue;
            }
            String normalized = normalizeUrl(node.url);
            if (!visited.add(normalized)) {
                continue;
            }
            if (!isAllowed(normalized, source, entryUrl)) {
                continue;
            }

            DocumentContentService.ExtractedDocument document;
            try {
                document = documentContentService.readUrlDetailed(node.url);
            } catch (RuntimeException e) {
                errors.add(node.url + ": " + e.getMessage());
                log.warn("采集页面失败 sourceId={} url={}: {}", source.getId(), node.url, e.getMessage());
                continue;
            }
            pagesFetched++;

            try {
                int count = aiCompetitionDraftService.ingestCrawledPage(
                        null, "crawler",
                        StrUtil.blankToDefault(document.getSourceUrl(), node.url),
                        StrUtil.blankToDefault(document.getSourceTitle(), source.getName()),
                        document);
                created += count;
            } catch (RuntimeException e) {
                errors.add(node.url + ": " + e.getMessage());
                log.warn("解析页面失败 sourceId={} url={}: {}", source.getId(), node.url, e.getMessage());
            }

            if (node.depth < depth && pagesFetched < maxPages) {
                List<String> nextLinks = documentContentService.rankCompetitionLinks(
                        document, Math.max(maxPages * 3, 20));
                for (String link : nextLinks) {
                    String linkNorm = normalizeUrl(link);
                    if (visited.contains(linkNorm) || !isAllowed(linkNorm, source, entryUrl)) {
                        continue;
                    }
                    queue.add(new CrawlNode(link, node.depth + 1));
                }
            }
        }

        if (pagesFetched == 0) {
            String detail = errors.isEmpty() ? "无法访问来源页面" : errors.get(0);
            throw new BusinessException("采集失败：" + detail);
        }
        if (created == 0 && !errors.isEmpty()) {
            log.info("来源 {} 抓取了 {} 页但未生成草稿，样例错误: {}", source.getName(), pagesFetched, errors.get(0));
        }
        return created;
    }

    private boolean isAllowed(String url, CompetitionSource source, String entryUrl) {
        if (StrUtil.isBlank(url)) {
            return false;
        }
        String lower = url.toLowerCase(Locale.ROOT);
        if (!(lower.startsWith("http://") || lower.startsWith("https://"))) {
            return false;
        }
        if (matchesAnyPattern(url, source.getDenyPatterns())) {
            return false;
        }
        if (StrUtil.isNotBlank(source.getAllowPatterns())
                && !matchesAnyPattern(url, source.getAllowPatterns())) {
            // 有白名单时必须命中；入口 URL 始终放行
            if (!normalizeUrl(url).equals(normalizeUrl(entryUrl))) {
                return false;
            }
        }
        // 默认优先同站，减少跑飞到无关外链
        try {
            String entryHost = URI.create(entryUrl).getHost();
            String host = URI.create(url).getHost();
            if (entryHost != null && host != null
                    && !host.equalsIgnoreCase(entryHost)
                    && !host.endsWith("." + entryHost)
                    && !entryHost.endsWith("." + host)) {
                // 外链仅当明显是赛事附件/详情关键词时才跟（已在 link score 过滤）
                return lower.contains("contest") || lower.contains("competition")
                        || lower.contains("dasai") || lower.contains("saikr")
                        || lower.contains("竞赛") || lower.contains("大赛");
            }
        } catch (Exception ignored) {
            return true;
        }
        return true;
    }

    private boolean matchesAnyPattern(String url, String patterns) {
        if (StrUtil.isBlank(patterns) || StrUtil.isBlank(url)) {
            return false;
        }
        String lower = url.toLowerCase(Locale.ROOT);
        for (String raw : patterns.split("[,，\\n\\r]+")) {
            String p = raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
            if (StrUtil.isNotBlank(p) && lower.contains(p)) {
                return true;
            }
        }
        return false;
    }

    private String normalizeUrl(String url) {
        if (StrUtil.isBlank(url)) {
            return "";
        }
        String value = url.trim();
        int hash = value.indexOf('#');
        if (hash >= 0) {
            value = value.substring(0, hash);
        }
        if (value.endsWith("/") && value.length() > 8) {
            value = value.substring(0, value.length() - 1);
        }
        return value;
    }

    private static final class CrawlNode {
        private final String url;
        private final int depth;

        private CrawlNode(String url, int depth) {
            this.url = url;
            this.depth = depth;
        }
    }
}
