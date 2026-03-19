import { Paper, UserKeyword, UserPaperAction } from '@prisma/client';

export interface ScoringWeights {
  keywordMatch: number;
  recency: number;
  feedback: number;
  ideaSignal: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  keywordMatch: 0.6,
  recency: 0.2,
  feedback: 0.15,
  ideaSignal: 0.05,
};

export interface PaperScore {
  paperId: string;
  keywordMatchScore: number;
  recencyScore: number;
  feedbackScore: number;
  ideaSignalScore: number;
  totalScore: number;
  matchedKeywords: string[];
  reasonTemplate: string;
}

export function calculateKeywordMatchScore(
  paper: Pick<Paper, 'title' | 'abstract'>,
  keywords: Pick<UserKeyword, 'term' | 'type' | 'weight' | 'synonyms'>[]
): { score: number; matchedKeywords: string[] } {
  const text = `${paper.title} ${paper.abstract || ''}`.toLowerCase();
  const matchedKeywords: string[] = [];
  let totalWeight = 0;
  let matchWeight = 0;

  for (const kw of keywords) {
    if (kw.type === 'EXCLUDE') continue;

    const weight = kw.weight;
    totalWeight += weight;

    const termsToCheck = [kw.term, ...(kw.synonyms || [])];
    const matched = termsToCheck.some(term =>
      text.includes(term.toLowerCase())
    );

    if (matched) {
      matchWeight += weight;
      matchedKeywords.push(kw.term);
    }
  }

  const score =
    totalWeight > 0 ? Math.min(matchWeight / totalWeight, 1.0) : 0;
  return { score, matchedKeywords };
}

export function calculateRecencyScore(publishedAt: Date | null): number {
  if (!publishedAt) return 0.1;

  const now = new Date();
  const daysDiff =
    (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60 * 24);

  if (daysDiff <= 7) return 1.0;
  if (daysDiff <= 30) return 0.9;
  if (daysDiff <= 90) return 0.7;
  if (daysDiff <= 180) return 0.5;
  if (daysDiff <= 365) return 0.3;
  return 0.1;
}

export function calculateFeedbackScore(
  paper: Pick<Paper, 'id' | 'title'>,
  userActions: Pick<UserPaperAction, 'paperId' | 'action'>[],
  _allPapers: Pick<Paper, 'id' | 'title'>[]
): number {
  const directActions = userActions.filter(a => a.paperId === paper.id);

  for (const action of directActions) {
    if (action.action === 'NOT_INTERESTED') return -1.0;
    if (action.action === 'BOOKMARKED') return 1.0;
    if (action.action === 'IDEA_GENERATED') return 1.0;
  }

  return 0;
}

export function calculateIdeaSignalScore(
  paper: Pick<Paper, 'id' | 'title'>,
  ideaActions: Pick<UserPaperAction, 'paperId' | 'action'>[],
  allPapers: Pick<Paper, 'id' | 'title'>[],
  keywords: Pick<UserKeyword, 'term' | 'synonyms'>[]
): number {
  const ideaPaperIds = new Set(
    ideaActions
      .filter(a => a.action === 'IDEA_GENERATED')
      .map(a => a.paperId)
  );

  if (ideaPaperIds.size === 0) return 0;

  const ideaPapers = allPapers.filter(p => ideaPaperIds.has(p.id));

  const paperKeywords = new Set<string>();
  keywords.forEach(kw => {
    const text = paper.title.toLowerCase();
    if (text.includes(kw.term.toLowerCase())) {
      paperKeywords.add(kw.term);
    }
    (kw.synonyms || []).forEach(syn => {
      if (text.includes(syn.toLowerCase())) paperKeywords.add(kw.term);
    });
  });

  let maxSimilarity = 0;
  for (const ideaPaper of ideaPapers) {
    const ideaKeywords = new Set<string>();
    keywords.forEach(kw => {
      const text = ideaPaper.title.toLowerCase();
      if (text.includes(kw.term.toLowerCase())) ideaKeywords.add(kw.term);
    });

    const intersection = new Set(
      [...paperKeywords].filter(k => ideaKeywords.has(k))
    );
    const union = new Set([...paperKeywords, ...ideaKeywords]);
    const similarity =
      union.size > 0 ? intersection.size / union.size : 0;
    maxSimilarity = Math.max(maxSimilarity, similarity);
  }

  return maxSimilarity;
}

export function buildReasonTemplate(
  matchedKeywords: string[],
  recencyScore: number,
  feedbackScore: number
): string {
  const parts: string[] = [];

  if (matchedKeywords.length > 0) {
    parts.push(`一致キーワード: ${matchedKeywords.slice(0, 3).join('、')}`);
  }

  if (recencyScore >= 0.9) {
    parts.push('新着性: 直近30日');
  } else if (recencyScore >= 0.7) {
    parts.push('新着性: 直近90日');
  }

  if (feedbackScore > 0) {
    parts.push('フィードバック: ブックマーク/アイデア類似');
  }

  return parts.length > 0 ? parts.join(' | ') : 'キーワード関連論文';
}

export function rankPapers(
  papers: Pick<Paper, 'id' | 'title' | 'abstract' | 'publishedAt'>[],
  keywords: Pick<UserKeyword, 'term' | 'type' | 'weight' | 'synonyms'>[],
  userActions: Pick<UserPaperAction, 'paperId' | 'action'>[],
  weights: ScoringWeights = DEFAULT_WEIGHTS,
  topN = 10
): PaperScore[] {
  const scores: PaperScore[] = [];

  const activeKeywords = keywords.filter(k => k.type !== 'EXCLUDE');
  const ideaActions = userActions.filter(
    a => a.action === 'IDEA_GENERATED'
  );

  for (const paper of papers) {
    const { score: keywordMatchScore, matchedKeywords } =
      calculateKeywordMatchScore(paper, activeKeywords);
    const recencyScore = calculateRecencyScore(paper.publishedAt);
    const feedbackScore = calculateFeedbackScore(
      paper,
      userActions,
      papers
    );
    const ideaSignalScore = calculateIdeaSignalScore(
      paper,
      ideaActions,
      papers,
      activeKeywords
    );

    const totalScore =
      weights.keywordMatch * keywordMatchScore +
      weights.recency * recencyScore +
      weights.feedback * Math.max(0, feedbackScore) +
      weights.ideaSignal * ideaSignalScore;

    scores.push({
      paperId: paper.id,
      keywordMatchScore,
      recencyScore,
      feedbackScore,
      ideaSignalScore,
      totalScore,
      matchedKeywords,
      reasonTemplate: buildReasonTemplate(
        matchedKeywords,
        recencyScore,
        feedbackScore
      ),
    });
  }

  return scores
    .filter(s => s.keywordMatchScore > 0 || s.feedbackScore > 0)
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, topN);
}
