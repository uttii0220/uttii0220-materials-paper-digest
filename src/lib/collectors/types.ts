export interface CollectedPaper {
  externalId: string;
  source: 'ARXIV' | 'CROSSREF' | 'PUBMED' | 'WEB_OF_SCIENCE' | 'SCOPUS' | 'MOCK';
  doi?: string;
  title: string;
  authors: string[];
  abstract?: string;
  journal?: string;
  publishedAt?: Date;
  year?: number;
  pdfUrl?: string;
  url?: string;
  rawData?: Record<string, unknown>;
}

export interface PaperCollector {
  name: string;
  collect(keywords: string[]): Promise<CollectedPaper[]>;
}
