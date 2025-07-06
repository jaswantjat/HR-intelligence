import FirecrawlApp from '@mendable/firecrawl-js';

interface ErrorResponse {
  success: false;
  error: string;
}

interface CrawlStatusResponse {
  success: true;
  status: string;
  completed: number;
  total: number;
  creditsUsed: number;
  expiresAt: string;
  data: any[];
}

type CrawlResponse = CrawlStatusResponse | ErrorResponse;

export class FirecrawlService {
  private static API_KEY_STORAGE_KEY = 'firecrawl_api_key';
  private static firecrawlApp: FirecrawlApp | null = null;

  static saveApiKey(apiKey: string): void {
    localStorage.setItem(this.API_KEY_STORAGE_KEY, apiKey);
    this.firecrawlApp = new FirecrawlApp({ apiKey });
    console.log('Firecrawl API key saved successfully');
  }

  static getApiKey(): string | null {
    return localStorage.getItem(this.API_KEY_STORAGE_KEY);
  }

  static async testApiKey(apiKey: string): Promise<boolean> {
    try {
      console.log('Testing Firecrawl API key');
      this.firecrawlApp = new FirecrawlApp({ apiKey });
      // Simple test to verify the API key
      const testResponse = await this.firecrawlApp.scrapeUrl('https://example.com');
      return testResponse.success;
    } catch (error) {
      console.error('Error testing Firecrawl API key:', error);
      return false;
    }
  }

  static async crawlJobPortals(companyName: string, companyWebsite?: string): Promise<{ success: boolean; error?: string; data?: any }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { success: false, error: 'Firecrawl API key not found' };
    }

    try {
      if (!this.firecrawlApp) {
        this.firecrawlApp = new FirecrawlApp({ apiKey });
      }

      const jobPortals = [
        `https://www.naukri.com/jobs-in-${companyName.toLowerCase().replace(/\s+/g, '-')}`,
        `https://www.timesjobs.com/candidate/job-search.html?searchType=personalizedSearch&from=submit&txtKeywords=${companyName}`,
        `https://www.indeed.com/q-${companyName.replace(/\s+/g, '-')}-jobs.html`,
        `https://www.foundit.in/srp/results?query=${companyName}&searchId=`,
        `https://www.shine.com/job-search/${companyName}`,
        `https://www.glassdoor.com/Jobs/${companyName}-jobs-SRCH_KO0,${companyName.length}.htm`,
        `https://www.freshersworld.com/jobs/jobsearch/${companyName}`,
        `https://www.jobsforher.com/jobs?q=${companyName}`,
        `https://cutshort.io/jobs?q=${companyName}`
      ];

      // Add company careers page if website provided
      if (companyWebsite) {
        jobPortals.unshift(`${companyWebsite}/careers`, `${companyWebsite}/jobs`);
      }

      const crawlPromises = jobPortals.map(async (url) => {
        try {
          console.log(`Crawling: ${url}`);
          const result = await this.firecrawlApp!.scrapeUrl(url, {
            formats: ['markdown', 'html'],
            onlyMainContent: true
          });
          return { 
            url, 
            success: result.success, 
            data: result.success ? (result as any).data : null,
            error: result.success ? undefined : 'Scraping failed'
          };
        } catch (error) {
          console.error(`Error crawling ${url}:`, error);
          return { url, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      });

      const results = await Promise.allSettled(crawlPromises);
      const successfulCrawls = results
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value)
        .filter(crawl => crawl.success);

      console.log(`Successfully crawled ${successfulCrawls.length} out of ${jobPortals.length} job portals`);
      
      return { 
        success: true,
        data: {
          companyName,
          companyWebsite,
          crawledPortals: successfulCrawls.length,
          totalPortals: jobPortals.length,
          results: successfulCrawls
        }
      };
    } catch (error) {
      console.error('Error during job portal crawling:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to crawl job portals' 
      };
    }
  }

  static extractJobsFromCrawlData(crawlData: any[]): any[] {
    const jobs: any[] = [];
    
    crawlData.forEach(crawl => {
      if (crawl.data?.markdown) {
        // Extract job information from markdown content
        const markdown = crawl.data.markdown;
        const jobMatches = this.parseJobsFromText(markdown);
        
        jobMatches.forEach(job => {
          jobs.push({
            ...job,
            source: crawl.url,
            crawledAt: new Date().toISOString()
          });
        });
      }
    });

    return jobs;
  }

  private static parseJobsFromText(text: string): any[] {
    const jobs: any[] = [];
    const lines = text.split('\n');
    
    // Enhanced job parsing patterns
    const jobPatterns = [
      /(?:job|position|role|opening).*?:?\s*(.+?)(?:\s*-\s*(.+?))?(?:\s*\|\s*(.+?))?$/i,
      /(.+?)\s*[-–]\s*(.+?)\s*[-–]\s*(.+?)$/i,
      /(\d+)\s*(?:opening|position|job)s?\s*(?:for|in)?\s*(.+?)(?:\s*(?:at|in)\s*(.+?))?$/i
    ];

    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine.length < 10) return; // Skip short lines
      
      for (const pattern of jobPatterns) {
        const match = trimmedLine.match(pattern);
        if (match) {
          const [, part1, part2, part3] = match;
          
          // Try to identify which part is title, location, count
          let title = part1?.trim();
          let location = part2?.trim() || 'Not specified';
          let count = part3?.trim() || '1';
          
          // If first part looks like a number, adjust parsing
          if (/^\d+$/.test(title)) {
            count = title;
            title = part2?.trim() || 'Unknown Position';
            location = part3?.trim() || 'Not specified';
          }
          
          if (title && title.length > 3) {
            jobs.push({
              title,
              count,
              location,
              rawText: trimmedLine
            });
          }
          break;
        }
      }
    });

    return jobs;
  }
}