import { CollectedPaper, PaperCollector } from './types';

export class ArxivCollector implements PaperCollector {
  name = 'ARXIV';
  private baseUrl = 'https://export.arxiv.org/api/query';

  async collect(keywords: string[]): Promise<CollectedPaper[]> {
    if (keywords.length === 0) return [];

    try {
      const query = keywords
        .map(k => `(ti:"${k}" OR abs:"${k}")`)
        .join(' OR ');

      const params = new URLSearchParams({
        search_query: query,
        start: '0',
        max_results: '30',
        sortBy: 'lastUpdatedDate',
        sortOrder: 'descending',
      });

      const response = await fetch(`${this.baseUrl}?${params}`, {
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        console.error(`[ArxivCollector] HTTP error: ${response.status}`);
        return [];
      }

      const xml = await response.text();
      return this.parseAtom(xml);
    } catch (error) {
      console.error('[ArxivCollector] Error:', error);
      return [];
    }
  }

  private parseAtom(xml: string): CollectedPaper[] {
    const papers: CollectedPaper[] = [];
    const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/g) || [];

    for (const entry of entries) {
      try {
        const id =
          this.extractTag(entry, 'id')
            ?.replace('http://arxiv.org/abs/', '')
            .split('v')[0] || '';
        const title =
          this.extractTag(entry, 'title')?.replace(/\s+/g, ' ').trim() || '';
        const abstract = this.extractTag(entry, 'summary')
          ?.replace(/\s+/g, ' ')
          .trim();
        const published = this.extractTag(entry, 'published');

        const authorMatches =
          entry.match(
            /<author>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<\/author>/g
          ) || [];
        const authors = authorMatches
          .map(a => {
            const m = a.match(/<name>(.*?)<\/name>/);
            return m ? m[1] : '';
          })
          .filter(Boolean);

        const doiMatch = entry.match(/<arxiv:doi[^>]*>(.*?)<\/arxiv:doi>/);
        const doi = doiMatch ? doiMatch[1].trim() : undefined;

        const pdfLink = entry.match(
          /href="(https?:\/\/arxiv\.org\/pdf\/[^"]+)"/
        );
        const pdfUrl = pdfLink ? pdfLink[1] : `https://arxiv.org/pdf/${id}`;

        const journalRef = this.extractTag(entry, 'arxiv:journal_ref');

        if (!id || !title) continue;

        papers.push({
          externalId: id,
          source: 'ARXIV',
          doi,
          title,
          authors,
          abstract,
          journal: journalRef || 'arXiv preprint',
          publishedAt: published ? new Date(published) : undefined,
          year: published ? new Date(published).getFullYear() : undefined,
          pdfUrl,
          url: `https://arxiv.org/abs/${id}`,
          rawData: { arxivId: id },
        });
      } catch {
        continue;
      }
    }

    return papers;
  }

  private extractTag(xml: string, tag: string): string | undefined {
    const match = xml.match(
      new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)
    );
    return match ? match[1].trim() : undefined;
  }
}
