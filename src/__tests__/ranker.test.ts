import {
  calculateKeywordMatchScore,
  calculateRecencyScore,
  rankPapers,
  DEFAULT_WEIGHTS,
} from '../lib/ranker';

describe('calculateKeywordMatchScore', () => {
  const keywords = [
    { term: '粒界', type: 'CORE' as const, weight: 1.0, synonyms: ['grain boundary'] },
    { term: 'DFT計算', type: 'CORE' as const, weight: 1.0, synonyms: ['DFT', 'density functional theory'] },
    { term: '除外ワード', type: 'EXCLUDE' as const, weight: 1.0, synonyms: [] },
  ];

  it('returns 0 score for no keyword match', () => {
    const paper = { title: 'Random Paper About Nothing', abstract: 'Nothing relevant here' };
    const { score } = calculateKeywordMatchScore(paper, keywords);
    expect(score).toBe(0);
  });

  it('returns positive score for keyword match in title', () => {
    const paper = { title: 'DFT Calculation of Grain Boundary Energy', abstract: null };
    const { score, matchedKeywords } = calculateKeywordMatchScore(paper, keywords);
    expect(score).toBeGreaterThan(0);
    expect(matchedKeywords).toContain('DFT計算');
    expect(matchedKeywords).toContain('粒界');
  });

  it('matches synonyms', () => {
    const paper = { title: 'grain boundary simulation study', abstract: null };
    const { score, matchedKeywords } = calculateKeywordMatchScore(paper, keywords);
    expect(score).toBeGreaterThan(0);
    expect(matchedKeywords).toContain('粒界');
  });

  it('ignores EXCLUDE type keywords', () => {
    const onlyExclude = [{ term: '除外ワード', type: 'EXCLUDE' as const, weight: 1.0, synonyms: [] }];
    const paper = { title: '除外ワード paper', abstract: null };
    const { score } = calculateKeywordMatchScore(paper, onlyExclude);
    expect(score).toBe(0);
  });
});

describe('calculateRecencyScore', () => {
  it('returns 1.0 for papers published within 7 days', () => {
    const date = new Date();
    date.setDate(date.getDate() - 3);
    expect(calculateRecencyScore(date)).toBe(1.0);
  });

  it('returns 0.9 for papers published within 30 days', () => {
    const date = new Date();
    date.setDate(date.getDate() - 15);
    expect(calculateRecencyScore(date)).toBe(0.9);
  });

  it('returns 0.3 for papers published within 1 year', () => {
    const date = new Date();
    date.setDate(date.getDate() - 200);
    expect(calculateRecencyScore(date)).toBe(0.3);
  });

  it('returns 0.1 for null date', () => {
    expect(calculateRecencyScore(null)).toBe(0.1);
  });

  it('returns 0.1 for very old papers', () => {
    const date = new Date('2010-01-01');
    expect(calculateRecencyScore(date)).toBe(0.1);
  });
});

describe('rankPapers', () => {
  const recentDate = new Date();
  recentDate.setDate(recentDate.getDate() - 5);

  const papers = [
    {
      id: 'paper1',
      title: 'DFT Calculation of Grain Boundary Energy',
      abstract: 'First principles DFT calculation for grain boundaries',
      publishedAt: recentDate,
    },
    {
      id: 'paper2',
      title: 'Random Paper About Something Else Entirely',
      abstract: 'This paper is about something completely unrelated',
      publishedAt: recentDate,
    },
    {
      id: 'paper3',
      title: 'Machine Learning Potential for MD Simulation',
      abstract: 'Neural network potential for molecular dynamics',
      publishedAt: recentDate,
    },
  ];

  const keywords = [
    { term: 'DFT', type: 'CORE' as const, weight: 1.0, synonyms: ['density functional theory', 'first principles'] },
    { term: 'grain boundary', type: 'CORE' as const, weight: 1.0, synonyms: ['grain boundaries'] },
    { term: 'machine learning', type: 'CORE' as const, weight: 0.9, synonyms: [] },
    { term: 'molecular dynamics', type: 'CORE' as const, weight: 0.9, synonyms: ['MD simulation'] },
  ];

  it('ranks papers by relevance', () => {
    const ranked = rankPapers(papers, keywords, [], DEFAULT_WEIGHTS, 10);
    expect(ranked.length).toBeGreaterThan(0);
    // paper1 and paper3 should rank higher than paper2
    const paper1Score = ranked.find(r => r.paperId === 'paper1')?.totalScore || 0;
    const paper2Score = ranked.find(r => r.paperId === 'paper2')?.totalScore || 0;
    expect(paper1Score).toBeGreaterThan(paper2Score);
  });

  it('returns at most topN papers', () => {
    const ranked = rankPapers(papers, keywords, [], DEFAULT_WEIGHTS, 1);
    expect(ranked.length).toBeLessThanOrEqual(1);
  });

  it('includes matched keywords in result', () => {
    const ranked = rankPapers(papers, keywords, [], DEFAULT_WEIGHTS, 10);
    const paper1Result = ranked.find(r => r.paperId === 'paper1');
    expect(paper1Result?.matchedKeywords.length).toBeGreaterThan(0);
  });

  it('excludes papers with no keyword match and no positive feedback', () => {
    const ranked = rankPapers(papers, keywords, [], DEFAULT_WEIGHTS, 10);
    const paper2Result = ranked.find(r => r.paperId === 'paper2');
    // paper2 has no keyword match, so should either not appear or have 0 score
    if (paper2Result) {
      expect(paper2Result.keywordMatchScore).toBe(0);
    }
  });
});
