import { CollectedPaper } from './collectors/types';

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u9fff]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleSimilarity(a: string, b: string): number {
  const normA = normalizeTitle(a);
  const normB = normalizeTitle(b);

  if (normA === normB) return 1.0;

  const wordsA = new Set(normA.split(' ').filter(w => w.length > 3));
  const wordsB = new Set(normB.split(' ').filter(w => w.length > 3));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);

  return intersection.size / union.size;
}

function authorsSimilarity(authorsA: string[], authorsB: string[]): number {
  if (authorsA.length === 0 || authorsB.length === 0) return 0.5;

  const setA = new Set(
    authorsA.map(a => a.toLowerCase().split(' ').pop() || '')
  );
  const setB = new Set(
    authorsB.map(a => a.toLowerCase().split(' ').pop() || '')
  );

  const intersection = new Set([...setA].filter(a => setB.has(a)));
  const minSize = Math.min(setA.size, setB.size);

  return minSize > 0 ? intersection.size / minSize : 0;
}

export interface DeduplicatedPaper {
  primary: CollectedPaper;
  duplicates: CollectedPaper[];
}

export function deduplicatePapers(
  papers: CollectedPaper[]
): DeduplicatedPaper[] {
  const groups: DeduplicatedPaper[] = [];
  const assigned = new Set<number>();

  for (let i = 0; i < papers.length; i++) {
    if (assigned.has(i)) continue;

    const group: DeduplicatedPaper = {
      primary: papers[i],
      duplicates: [],
    };

    for (let j = i + 1; j < papers.length; j++) {
      if (assigned.has(j)) continue;

      const a = papers[i];
      const b = papers[j];

      let isDuplicate = false;

      // DOI match (highest priority)
      if (a.doi && b.doi && a.doi.toLowerCase() === b.doi.toLowerCase()) {
        isDuplicate = true;
      } else {
        const titleSim = titleSimilarity(a.title, b.title);
        const authorSim = authorsSimilarity(a.authors, b.authors);
        const sameYear = !a.year || !b.year || a.year === b.year;

        if (titleSim > 0.85 && authorSim > 0.5 && sameYear) {
          isDuplicate = true;
        }
      }

      if (isDuplicate) {
        group.duplicates.push(b);
        assigned.add(j);
      }
    }

    groups.push(group);
    assigned.add(i);
  }

  return groups;
}

export { normalizeTitle };
