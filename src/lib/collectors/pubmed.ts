import { CollectedPaper, PaperCollector } from './types';

export class PubMedCollector implements PaperCollector {
  name = 'PUBMED';
  private baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
  private apiKey = process.env.PUBMED_API_KEY;

  async collect(keywords: string[]): Promise<CollectedPaper[]> {
    if (keywords.length === 0) return [];

    try {
      const query = keywords.map(k => `"${k}"`).join(' OR ');
      const apiKeyParam = this.apiKey ? `&api_key=${this.apiKey}` : '';

      const searchUrl = `${this.baseUrl}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=20&sort=date&retmode=json&datetype=pdat&reldate=90${apiKeyParam}`;

      const searchRes = await fetch(searchUrl, {
        signal: AbortSignal.timeout(30000),
      });

      if (!searchRes.ok) {
        console.error(
          `[PubMedCollector] Search HTTP error: ${searchRes.status}`
        );
        return [];
      }

      const searchData = await searchRes.json();
      const ids: string[] = searchData.esearchresult?.idlist || [];

      if (ids.length === 0) return [];

      await new Promise(r => setTimeout(r, 500));

      const fetchUrl = `${this.baseUrl}/efetch.fcgi?db=pubmed&id=${ids.join(',')}&rettype=xml&retmode=xml${apiKeyParam}`;
      const fetchRes = await fetch(fetchUrl, {
        signal: AbortSignal.timeout(30000),
      });

      if (!fetchRes.ok) {
        console.error(
          `[PubMedCollector] Fetch HTTP error: ${fetchRes.status}`
        );
        return [];
      }

      const xml = await fetchRes.text();
      return this.parseXml(xml);
    } catch (error) {
      console.error('[PubMedCollector] Error:', error);
      return [];
    }
  }

  private parseXml(xml: string): CollectedPaper[] {
    const papers: CollectedPaper[] = [];
    const articles =
      xml.match(/<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g) || [];

    for (const article of articles) {
      try {
        const pmid = article.match(/<PMID[^>]*>(\d+)<\/PMID>/)?.[1];
        if (!pmid) continue;

        const title = article
          .match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/)?.[1]
          ?.replace(/[<>]/g, '')
          .trim();
        if (!title) continue;

        const abstractTexts =
          article.match(
            /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g
          ) || [];
        const abstract =
          abstractTexts
            .map(t => t.replace(/[<>]/g, ''))
            .join(' ')
            .trim() || undefined;

        const authorNodes =
          article.match(/<Author[^>]*>([\s\S]*?)<\/Author>/g) || [];
        const authors = authorNodes
          .map(a => {
            const last = a.match(/<LastName>(.*?)<\/LastName>/)?.[1] || '';
            const first = a.match(/<ForeName>(.*?)<\/ForeName>/)?.[1] || '';
            return [first, last].filter(Boolean).join(' ');
          })
          .filter(Boolean);

        const doi = article.match(
          /<ArticleId IdType="doi">(.*?)<\/ArticleId>/
        )?.[1];
        const journal = article
          .match(/<Title>([\s\S]*?)<\/Title>/)?.[1]
          ?.replace(/[<>]/g, '')
          .trim();

        const yearStr = article.match(
          /<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/
        )?.[1];
        const monthStr = article.match(
          /<PubDate>[\s\S]*?<Month>(\w+)<\/Month>/
        )?.[1];
        const year = yearStr ? parseInt(yearStr) : undefined;

        let publishedAt: Date | undefined;
        if (year) {
          const month = monthStr ? this.parseMonth(monthStr) : 0;
          publishedAt = new Date(year, month, 1);
        }

        papers.push({
          externalId: pmid,
          source: 'PUBMED',
          doi,
          title,
          authors,
          abstract,
          journal,
          publishedAt,
          year,
          pdfUrl: undefined,
          url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        });
      } catch {
        continue;
      }
    }

    return papers;
  }

  private parseMonth(month: string): number {
    const months: Record<string, number> = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };
    return months[month] ?? 0;
  }
}
