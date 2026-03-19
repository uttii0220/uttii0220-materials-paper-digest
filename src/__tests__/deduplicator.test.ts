import { deduplicatePapers } from '../lib/deduplicator';
import { CollectedPaper } from '../lib/collectors/types';

const makePaper = (overrides: Partial<CollectedPaper>): CollectedPaper => ({
  externalId: 'test-1',
  source: 'ARXIV',
  title: 'Test Paper on Grain Boundaries',
  authors: ['Smith, J', 'Doe, A'],
  year: 2024,
  ...overrides,
});

describe('deduplicatePapers', () => {
  it('returns empty array for empty input', () => {
    expect(deduplicatePapers([])).toHaveLength(0);
  });

  it('returns single paper unchanged', () => {
    const paper = makePaper({});
    const result = deduplicatePapers([paper]);
    expect(result).toHaveLength(1);
    expect(result[0].primary).toEqual(paper);
    expect(result[0].duplicates).toHaveLength(0);
  });

  it('deduplicates by DOI match', () => {
    const paper1 = makePaper({ externalId: 'arxiv-1', source: 'ARXIV', doi: '10.1234/test' });
    const paper2 = makePaper({ externalId: 'crossref-1', source: 'CROSSREF', doi: '10.1234/test' });
    const paper3 = makePaper({ externalId: 'pubmed-1', source: 'PUBMED', doi: '10.9999/other' });

    const result = deduplicatePapers([paper1, paper2, paper3]);
    expect(result).toHaveLength(2);
    expect(result[0].duplicates).toHaveLength(1);
    expect(result[0].duplicates[0]).toEqual(paper2);
  });

  it('does not deduplicate papers with different DOIs', () => {
    const paper1 = makePaper({ doi: '10.1234/test1' });
    const paper2 = makePaper({ doi: '10.1234/test2' });

    const result = deduplicatePapers([paper1, paper2]);
    expect(result).toHaveLength(2);
  });

  it('deduplicates by title similarity when no DOI', () => {
    const paper1 = makePaper({
      externalId: 'a1',
      title: 'Machine Learning Potential for Grain Boundary Simulation',
      authors: ['Smith, J', 'Doe, A'],
      year: 2024,
    });
    const paper2 = makePaper({
      externalId: 'a2',
      title: 'Machine Learning Potential for Grain Boundary Simulation',
      authors: ['Smith, J', 'Doe, A'],
      year: 2024,
    });

    const result = deduplicatePapers([paper1, paper2]);
    expect(result).toHaveLength(1);
    expect(result[0].duplicates).toHaveLength(1);
  });

  it('does not deduplicate clearly different papers', () => {
    const paper1 = makePaper({
      externalId: 'a1',
      title: 'DFT Calculation of Grain Boundary Energy',
      authors: ['Smith, J'],
      year: 2024,
    });
    const paper2 = makePaper({
      externalId: 'a2',
      title: 'Molecular Dynamics Simulation of Point Defects',
      authors: ['Lee, K'],
      year: 2023,
    });

    const result = deduplicatePapers([paper1, paper2]);
    expect(result).toHaveLength(2);
  });
});
