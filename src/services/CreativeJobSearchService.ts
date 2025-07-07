interface JobResult {
  title: string;
  count: string;
  location: string;
  sourceUrl: string;
  salary?: string;
  datePosted?: string;
  jobType?: string;
  company: string;
  atsSource: string;
  description?: string;
  skills?: string[];
}

interface SearchResult {
  success: boolean;
  jobs: JobResult[];
  sources: string[];
  totalFound: number;
  errors?: string[];
}

export class CreativeJobSearchService {
  // Google Custom Search API (100 free queries/day)
  private static async searchWithGoogleCustomSearch(companyName: string, apiKey?: string, searchEngineId?: string): Promise<{ jobs: JobResult[], source: string }> {
    if (!apiKey || !searchEngineId) {
      return { jobs: [], source: 'Google Custom Search' };
    }

    try {
      const queries = [
        `"${companyName}" jobs site:linkedin.com/jobs`,
        `"${companyName}" careers "apply now"`,
        `"${companyName}" "we're hiring" -indeed -linkedin`,
        `intitle:"jobs at ${companyName}"`
      ];

      const jobs: JobResult[] = [];

      for (const query of queries.slice(0, 2)) { // Limit to preserve quota
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}`;
        
        const response = await fetch(url);
        if (!response.ok) continue;
        
        const data = await response.json();
        
        if (data.items) {
          data.items.slice(0, 5).forEach((item: any) => {
            jobs.push({
              title: this.extractJobTitle(item.title) || 'Career Opportunity',
              count: '1',
              location: this.extractLocation(item.snippet) || 'Location not specified',
              sourceUrl: item.link,
              company: companyName,
              atsSource: 'Google Search',
              description: item.snippet?.substring(0, 200),
              datePosted: 'Recently posted'
            });
          });
        }
      }

      return { jobs, source: 'Google Custom Search' };
    } catch (error) {
      console.error('Google Custom Search failed:', error);
      return { jobs: [], source: 'Google Custom Search' };
    }
  }

  // RSS Feed Monitoring for career pages
  private static async searchRSSFeeds(companyName: string): Promise<{ jobs: JobResult[], source: string }> {
    const companyLower = companyName.toLowerCase().replace(/\s+/g, '');
    
    // Common RSS feed patterns for company career pages
    const rssUrls = [
      `https://careers.${companyLower}.com/feed`,
      `https://jobs.${companyLower}.com/rss`,
      `https://${companyLower}.com/careers/feed`,
      `https://${companyLower}.com/jobs.rss`,
      // Remote job RSS feeds
      'https://remotive.com/feed',
      'https://weworkremotely.com/categories/remote-programming-jobs.rss'
    ];

    const jobs: JobResult[] = [];

    try {
      for (const rssUrl of rssUrls.slice(0, 3)) { // Limit RSS checks
        try {
          const response = await fetch(rssUrl);
          if (!response.ok) continue;
          
          const rssText = await response.text();
          const rssJobs = await this.parseRSSFeed(rssText, companyName);
          jobs.push(...rssJobs);
          
          if (jobs.length > 0) break; // Found jobs, no need to check more feeds
        } catch (error) {
          console.warn(`RSS feed failed for ${rssUrl}:`, error);
        }
      }

      return { jobs, source: 'RSS Feeds' };
    } catch (error) {
      console.error('RSS feed search failed:', error);
      return { jobs: [], source: 'RSS Feeds' };
    }
  }

  // Parse RSS feed content to extract job listings
  private static async parseRSSFeed(rssContent: string, companyName: string): Promise<JobResult[]> {
    const jobs: JobResult[] = [];
    
    try {
      // Simple RSS parsing - look for job-related items
      const itemMatches = rssContent.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];
      
      itemMatches.slice(0, 10).forEach(item => {
        const title = this.extractXMLContent(item, 'title');
        const link = this.extractXMLContent(item, 'link');
        const description = this.extractXMLContent(item, 'description');
        const pubDate = this.extractXMLContent(item, 'pubDate');
        
        if (title && this.isJobRelated(title)) {
          jobs.push({
            title: title,
            count: '1',
            location: this.extractLocation(description) || 'Remote/Multiple locations',
            sourceUrl: link || '#',
            company: companyName,
            atsSource: 'RSS Feed',
            description: description?.substring(0, 200),
            datePosted: this.formatRSSDate(pubDate)
          });
        }
      });
    } catch (error) {
      console.warn('RSS parsing failed:', error);
    }

    return jobs;
  }

  // Free job aggregation APIs with better filtering
  private static async searchFreeJobAPIs(companyName: string): Promise<{ jobs: JobResult[], source: string }> {
    const jobs: JobResult[] = [];
    const companyLower = companyName.toLowerCase();
    
    try {
      // Arbeitnow API (European and remote jobs) - with better filtering
      const arbeitnowUrl = `https://www.arbeitnow.com/api/job-board-api?search=${encodeURIComponent(companyName)}`;
      
      try {
        const response = await fetch(arbeitnowUrl);
        if (response.ok) {
          const data = await response.json();
          
          if (data.data) {
            // Filter for relevant jobs only
            const relevantJobs = data.data.filter((job: any) => {
              const jobCompany = (job.company_name || '').toLowerCase();
              const jobTitle = (job.title || '').toLowerCase();
              
              // Only include if company name matches or job title mentions the company
              return jobCompany.includes(companyLower) ||
                     companyLower.includes(jobCompany) ||
                     jobTitle.includes(companyLower) ||
                     this.isCompanyRelated(job, companyName);
            });
            
            relevantJobs.slice(0, 5).forEach((job: any) => {
              // Only add jobs with valid dates (not too old)
              const datePosted = job.created_at ? this.formatDate(job.created_at) : undefined;
              
              if (datePosted || !job.created_at) { // Include if no date or valid date
                jobs.push({
                  title: job.title || 'Job Opening',
                  count: '1',
                  location: job.location || 'Remote',
                  sourceUrl: job.url || job.company_url || '#',
                  salary: job.salary || undefined,
                  jobType: job.job_types?.[0] || 'Full-time',
                  company: job.company_name || companyName,
                  atsSource: 'Arbeitnow',
                  description: job.description?.substring(0, 200),
                  datePosted: datePosted
                });
              }
            });
          }
        }
      } catch (error) {
        console.warn('Arbeitnow API failed:', error);
      }

      // Jobicy Remote Jobs API - with better filtering
      try {
        const jobicyUrl = `https://jobicy.com/api/v2/remote-jobs?count=10&tag=${encodeURIComponent(companyName)}`;
        const response = await fetch(jobicyUrl);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.jobs) {
            // Filter for relevant remote jobs
            const relevantJobs = data.jobs.filter((job: any) => {
              const jobCompany = (job.companyName || '').toLowerCase();
              const jobTitle = (job.jobTitle || '').toLowerCase();
              
              return jobCompany.includes(companyLower) ||
                     companyLower.includes(jobCompany) ||
                     jobTitle.includes(companyLower);
            });
            
            relevantJobs.slice(0, 3).forEach((job: any) => {
              const datePosted = job.pubDate ? this.formatDate(job.pubDate) : undefined;
              
              if (datePosted || !job.pubDate) {
                jobs.push({
                  title: job.jobTitle || 'Remote Position',
                  count: '1',
                  location: 'Remote',
                  sourceUrl: job.url || '#',
                  salary: job.annualSalaryMin ? `$${job.annualSalaryMin} - $${job.annualSalaryMax}` : undefined,
                  jobType: job.jobType || 'Full-time',
                  company: job.companyName || companyName,
                  atsSource: 'Jobicy',
                  description: job.jobExcerpt?.substring(0, 200),
                  datePosted: datePosted
                });
              }
            });
          }
        }
      } catch (error) {
        console.warn('Jobicy API failed:', error);
      }

    } catch (error) {
      console.error('Free job APIs search failed:', error);
    }

    return { jobs, source: 'Free Job APIs' };
  }

  // Helper method to check if job is related to company
  private static isCompanyRelated(job: any, companyName: string): boolean {
    const companyLower = companyName.toLowerCase();
    const searchFields = [
      job.description || '',
      job.tags?.join(' ') || '',
      job.requirements || '',
      job.skills?.join(' ') || ''
    ];
    
    // Check if company name appears in job details
    return searchFields.some(field => 
      field.toLowerCase().includes(companyLower)
    );
  }

  // Social media job monitoring (simplified version)
  private static async searchSocialMedia(companyName: string): Promise<{ jobs: JobResult[], source: string }> {
    // This would require specific social media APIs
    // For now, return structured suggestions for manual monitoring
    const jobs: JobResult[] = [];

    // Provide social media monitoring suggestions
    const socialSuggestions = [
      {
        title: `Monitor @${companyName.replace(/\s+/g, '')} on Twitter`,
        count: 'Various',
        location: 'Follow social updates',
        sourceUrl: `https://twitter.com/search?q="${companyName}" jobs OR hiring OR "we're hiring"`,
        company: companyName,
        atsSource: 'Twitter Monitoring',
        description: 'Monitor company Twitter for job announcements and hiring posts'
      },
      {
        title: `LinkedIn Company Page Jobs`,
        count: 'Multiple',
        location: 'Various locations',
        sourceUrl: `https://www.linkedin.com/company/${companyName.toLowerCase().replace(/\s+/g, '-')}/jobs/`,
        company: companyName,
        atsSource: 'LinkedIn Social',
        description: 'Check LinkedIn company page for latest job postings'
      }
    ];

    jobs.push(...socialSuggestions);

    return { jobs, source: 'Social Media Monitoring' };
  }

  // Utility methods
  private static extractJobTitle(text: string): string | null {
    const jobKeywords = ['job', 'position', 'role', 'opening', 'career', 'hiring', 'engineer', 'developer', 'manager', 'analyst', 'specialist'];
    
    if (jobKeywords.some(keyword => text.toLowerCase().includes(keyword))) {
      return text.split(' - ')[0].split(' | ')[0]; // Clean up title
    }
    
    return null;
  }

  private static extractLocation(text: string): string | null {
    if (!text) return null;
    
    const locationPatterns = [
      /(?:in|at|located)\s+([A-Za-z\s,]+)(?:\s|$)/i,
      /([A-Za-z]+,\s*[A-Z]{2})/g, // City, State format
      /(Remote|Hybrid|On-site)/i
    ];
    
    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match) return match[1] || match[0];
    }
    
    return null;
  }

  private static extractXMLContent(xml: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : null;
  }

  private static isJobRelated(title: string): boolean {
    const jobKeywords = ['job', 'position', 'hiring', 'career', 'opening', 'role', 'opportunity', 'vacancy'];
    return jobKeywords.some(keyword => title.toLowerCase().includes(keyword));
  }

  private static formatDate(dateStr: string): string | undefined {
    if (!dateStr) return undefined;
    
    try {
      const date = new Date(dateStr);
      const now = new Date();
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return undefined;
      }
      
      // Check if date is unreasonably old (more than 2 years)
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      
      if (date < twoYearsAgo) {
        return undefined; // Don't show very old dates
      }
      
      const diffTime = now.getTime() - date.getTime();
      
      // Check if date is in the future
      if (diffTime < 0) {
        return 'Recently posted';
      }
      
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
      
      // If more than a year old, don't show it
      return undefined;
    } catch {
      return undefined;
    }
  }

  private static formatRSSDate(pubDate: string | null): string | undefined {
    if (!pubDate) return undefined;
    return this.formatDate(pubDate);
  }

  // Main search method combining all creative approaches
  public static async searchWithCreativeMethods(
    companyName: string, 
    options: {
      googleApiKey?: string;
      googleSearchEngineId?: string;
      includeRSS?: boolean;
      includeFreeAPIs?: boolean;
      includeSocialMedia?: boolean;
    } = {}
  ): Promise<SearchResult> {
    console.log(`Creative job search for: ${companyName}`);
    
    const allJobs: JobResult[] = [];
    const sources: string[] = [];
    const errors: string[] = [];

    const searchPromises = [];

    // Google Custom Search (if API keys provided)
    if (options.googleApiKey && options.googleSearchEngineId) {
      searchPromises.push({
        name: 'Google Search',
        promise: this.searchWithGoogleCustomSearch(companyName, options.googleApiKey, options.googleSearchEngineId)
      });
    }

    // RSS Feeds (enabled by default)
    if (options.includeRSS !== false) {
      searchPromises.push({
        name: 'RSS Feeds',
        promise: this.searchRSSFeeds(companyName)
      });
    }

    // Free Job APIs (enabled by default)
    if (options.includeFreeAPIs !== false) {
      searchPromises.push({
        name: 'Free APIs',
        promise: this.searchFreeJobAPIs(companyName)
      });
    }

    // Social Media Monitoring
    if (options.includeSocialMedia) {
      searchPromises.push({
        name: 'Social Media',
        promise: this.searchSocialMedia(companyName)
      });
    }

    // Execute all searches
    const results = await Promise.allSettled(searchPromises.map(p => p.promise));
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { jobs, source } = result.value;
        if (jobs.length > 0) {
          allJobs.push(...jobs);
          sources.push(source);
          console.log(`✓ ${searchPromises[index].name}: Found ${jobs.length} jobs`);
        }
      } else {
        errors.push(`${searchPromises[index].name}: ${result.reason?.message || 'Failed'}`);
      }
    });

    // Remove duplicates
    const uniqueJobs = this.removeDuplicates(allJobs);

    return {
      success: uniqueJobs.length > 0,
      jobs: uniqueJobs,
      sources,
      totalFound: uniqueJobs.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private static removeDuplicates(jobs: JobResult[]): JobResult[] {
    const seen = new Set<string>();
    return jobs.filter(job => {
      const key = `${job.title.toLowerCase().trim()}-${job.company.toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Get configuration status for creative methods
  public static getMethodsStatus(apiKeys: { googleApiKey?: string; googleSearchEngineId?: string }): { [key: string]: boolean } {
    return {
      'Google Custom Search': !!(apiKeys.googleApiKey && apiKeys.googleSearchEngineId),
      'RSS Feed Monitoring': true, // Always available
      'Free Job APIs': true, // Always available
      'Social Media Monitoring': true, // Always available (provides guidance)
    };
  }
}