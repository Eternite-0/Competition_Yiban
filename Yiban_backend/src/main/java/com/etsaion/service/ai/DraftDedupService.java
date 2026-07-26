package com.etsaion.service.ai;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.etsaion.entity.AiCompetitionDraft;
import com.etsaion.entity.Competition;
import com.etsaion.mapper.AiCompetitionDraftMapper;
import com.etsaion.service.CompetitionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

/**
 * 判断一份草稿是否已经存在——既可能已经是正式赛事，也可能是另一份还没处理的草稿。
 *
 * 从 {@code AiCompetitionDraftServiceImpl} 拆出来。原实现把整张赛事表
 * 拉进内存逐条算编辑距离，且用 {@code catch (Exception ignored)} 把异常吞掉，
 * 判重悄悄失效时没人知道。
 */
@Slf4j
@Service
public class DraftDedupService {

    /** 只在少量候选上做编辑距离；候选靠 SQL 先筛。 */
    private static final int MAX_CANDIDATES = 500;

    @Autowired
    private CompetitionService competitionService;

    @Autowired
    private AiCompetitionDraftMapper draftMapper;

    /**
     * 找出与草稿重复的正式赛事。
     *
     * @return 命中的赛事，没有则返回 null；命中时会把相似度写回草稿
     */
    public Competition findDuplicateCompetition(AiCompetitionDraft draft) {
        // 同一个来源链接是最硬的证据，先走这条索引友好的路径
        if (StrUtil.isNotBlank(draft.getSourceUrl())) {
            Competition bySource = competitionService.getOne(new LambdaQueryWrapper<Competition>()
                    .eq(Competition::getSourceUrl, draft.getSourceUrl())
                    .last("LIMIT 1"));
            if (bySource != null) {
                draft.setDuplicateScore(BigDecimal.ONE);
                return bySource;
            }
        }

        String normalized = CompetitionNameMatcher.normalize(draft.getName());
        if (StrUtil.isBlank(normalized)) {
            return null;
        }

        List<Competition> candidates = candidateCompetitions(draft.getName());
        Competition best = null;
        double bestScore = 0;
        for (Competition candidate : candidates) {
            double score = CompetitionNameMatcher.similarity(
                    normalized, CompetitionNameMatcher.normalize(candidate.getName()));
            if (score > bestScore) {
                bestScore = score;
                best = candidate;
            }
        }
        if (best != null && bestScore >= CompetitionNameMatcher.DUPLICATE_THRESHOLD) {
            draft.setDuplicateScore(BigDecimal.valueOf(bestScore));
            return best;
        }
        return null;
    }

    /** 是否已有另一份同赛事的草稿在等待处理或已确认。 */
    public boolean hasDuplicatePendingDraft(AiCompetitionDraft draft) {
        if (draftMapper == null) {
            return false;
        }
        List<AiCompetitionDraft> open = draftMapper.selectList(
                new LambdaQueryWrapper<AiCompetitionDraft>()
                        .select(AiCompetitionDraft::getId, AiCompetitionDraft::getName,
                                AiCompetitionDraft::getSourceUrl)
                        .in(AiCompetitionDraft::getStatus, "pending_review", "confirmed")
                        .orderByDesc(AiCompetitionDraft::getId)
                        .last("LIMIT " + MAX_CANDIDATES));
        String normalized = CompetitionNameMatcher.normalize(draft.getName());
        for (AiCompetitionDraft other : open) {
            if (other.getId() != null && other.getId().equals(draft.getId())) {
                continue;
            }
            if (StrUtil.isNotBlank(draft.getSourceUrl())
                    && draft.getSourceUrl().equals(other.getSourceUrl())) {
                return true;
            }
            if (StrUtil.isNotBlank(normalized)
                    && CompetitionNameMatcher.similarity(
                            normalized, CompetitionNameMatcher.normalize(other.getName()))
                    >= CompetitionNameMatcher.DRAFT_DUPLICATE_THRESHOLD) {
                return true;
            }
        }
        return false;
    }

    /**
     * 缩小要做编辑距离的候选集。
     *
     * 用名称里最有区分度的片段先在 SQL 里筛一道，避免把整张表拉进内存；
     * 取不到这样的片段时退回到取最近的一批赛事。
     */
    private List<Competition> candidateCompetitions(String rawName) {
        LambdaQueryWrapper<Competition> wrapper = new LambdaQueryWrapper<Competition>()
                .select(Competition::getId, Competition::getName)
                .isNotNull(Competition::getName);

        String keyword = distinctiveFragment(rawName);
        if (keyword != null) {
            wrapper.like(Competition::getName, keyword);
        }
        wrapper.orderByDesc(Competition::getId).last("LIMIT " + MAX_CANDIDATES);
        return competitionService.list(wrapper);
    }

    /**
     * 取名称中最长的一段连续中文或字母数字，作为 SQL 预筛的关键词。
     * 太短的片段区分度不够，宁可不筛。
     */
    private String distinctiveFragment(String rawName) {
        if (StrUtil.isBlank(rawName)) {
            return null;
        }
        String longest = "";
        StringBuilder current = new StringBuilder();
        for (char c : rawName.toCharArray()) {
            if (Character.isLetterOrDigit(c)) {
                current.append(c);
            } else {
                if (current.length() > longest.length()) {
                    longest = current.toString();
                }
                current.setLength(0);
            }
        }
        if (current.length() > longest.length()) {
            longest = current.toString();
        }
        // 纯数字（多半是年份）或过短的片段筛不出东西
        return longest.length() >= 4 && !longest.chars().allMatch(Character::isDigit) ? longest : null;
    }
}
