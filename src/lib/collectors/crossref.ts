import { CollectedPaper, PaperCollector } from './types';

interface CrossrefWork {
  DOI?: string;
  title?: string[];
  author?: Array<{ given?: string; family?: string }>;
  abstract?: string;
  'container-title'?: string[];
  published?: { 'date-parts': number[][] };
  link?: Array<{ URL: string; 'content-type': string }>;
}

interface CrossrefResponse {
  message: {
    items: CrossrefWork[];
  };
}

export class CrossrefCollector implements PaperCollector {
  name = 'CROSSREF';
  private baseUrl = 'https://api.crossref.org/works';

  async collect(keywords: string[]): Promise<CollectedPaper[]> {
    if (keywords.length === 0) return [];

    const papers: CollectedPaper[] = [];

    for (const keyword of keywords.slice(0, 3)) {
      try {
        const params = new URLSearchParams({
          query: keyword,
          rows: '10',
          sort: 'published',
          order: 'desc',
          filter: 'from-pub-date:2023-01-01',
          select: 'DOI,title,author,abstract,container-title,published,link',
        });

        const response = await fetch(`${this.baseUrl}?${params}`, {
          headers: {
            'User-Agent':
              'MaterialsPaperDigest/1.0 (mailto:contact@example.com)',
          },
          signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
          console.error(
            `[CrossrefCollector] HTTP error for keyword "${keyword}": ${response.status}`
          );
          continue;
        }

        const data: CrossrefResponse = await response.json();
        const items = data.message?.items || [];

        for (const item of items) {
          const doi = item.DOI;
          const title = item.title?.[0];
          if (!title) continue;

          const authors = (item.author || []).map(a =>
            [a.given, a.family].filter(Boolean).join(' ')
          );

          const dateParts = item.published?.['date-parts']?.[0];
          const year = dateParts?.[0];
          const publishedAt = dateParts
            ? new Date(
                dateParts[0],
                (dateParts[1] || 1) - 1,
                dateParts[2] || 1
              )
            : undefined;

          const pdfLink = item.link?.find(
            l => l['content-type'] === 'application/pdf'
          );

          papers.push({
            externalId: doi || `crossref-${title.slice(0, 50)}`,
            source: 'CROSSREF',
            doi,
            title,
            authors,
            abstract: item.abstract?.replace(/[<>]/g, ''),
            journal: item['container-title']?.[0],
            publishedAt,
            year,
            pdfUrl: pdfLink?.URL,
            url: doi ? `https://doi.org/${doi}` : undefined,
          });
        }

        await new Promise(r => setTimeout(r, 300));
      } catch (error) {
        console.error(
          `[CrossrefCollector] Error for keyword "${keyword}":`,
          error
        );
      }
    }

    return papers;
  }
}
