import { CollectedPaper, PaperCollector } from './types';

export class MockCollector implements PaperCollector {
  name = 'MOCK';

  async collect(_keywords: string[]): Promise<CollectedPaper[]> {
    console.log(
      '[MockCollector] Returning empty results (placeholder for WoS/Scopus)'
    );
    return [];
  }
}

export class WebOfScienceCollector implements PaperCollector {
  name = 'WEB_OF_SCIENCE';

  async collect(_keywords: string[]): Promise<CollectedPaper[]> {
    if (!process.env.WOS_API_KEY) {
      console.warn('[WebOfScienceCollector] WOS_API_KEY not set, skipping');
      return [];
    }
    console.warn(
      '[WebOfScienceCollector] Not yet implemented, requires Starter API subscription'
    );
    return [];
  }
}

export class ScopusCollector implements PaperCollector {
  name = 'SCOPUS';

  async collect(_keywords: string[]): Promise<CollectedPaper[]> {
    if (!process.env.SCOPUS_API_KEY) {
      console.warn('[ScopusCollector] SCOPUS_API_KEY not set, skipping');
      return [];
    }
    console.warn(
      '[ScopusCollector] Not yet implemented, requires Elsevier API key'
    );
    return [];
  }
}
