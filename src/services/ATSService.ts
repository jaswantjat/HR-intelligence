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
}

interface ATSResponse {
  success: boolean;
  jobs: JobResult[];
  source: string;
}

export class ATSService {
  private static readonly ATS_APIS = {
    greenhouse: 'https://api.greenhouse.io/v1/boards',
    lever: 'https://api.lever.co/v0/postings',
    workable: 'https://{company}.workable.com/spi/v3/jobs',
    ashby: 'https://api.ashbyhq.com/posting-api/job-board',
    recruitee: 'https://{company}.recruitee.com/api/offers'
  };

  // Generate possible company identifiers from company name
  private static generateCompanyIdentifiers(companyName: string): string[] {
    const cleanName = companyName.toLowerCase().trim();
    const identifiers = [
      cleanName,
      cleanName.replace(/\s+/g, ''),
      cleanName.replace(/\s+/g, '-'),
      cleanName.replace(/\s+/g, '_'),
      cleanName.replace(/[^a-z0-9]/g, ''),
      cleanName.replace(/[^a-z0-9]/g, '-'),
    ];

    // Remove common suffixes
    const withoutSuffixes = identifiers.map(id => 
      id.replace(/[-_]?(inc|corp|ltd|llc|company|co)$/, '')
    );

    return [...new Set([...identifiers, ...withoutSuffixes])];
  }

  // Fetch jobs from Greenhouse API
  private static async fetchFromGreenhouse(companyName: string): Promise<ATSResponse> {
    const identifiers = this.generateCompanyIdentifiers(companyName);
    
    for (const identifier of identifiers) {
      try {
        const url = `${this.ATS_APIS.greenhouse}/${identifier}/jobs?content=true`;
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          const jobs = this.parseGreenhouseJobs(data.jobs || [], companyName);
          return { success: true, jobs, source: 'Greenhouse' };
        }
      } catch (error) {
        console.warn(`Greenhouse API failed for ${identifier}:`, error);
      }
    }
    
    return { success: false, jobs: [], source: 'Greenhouse' };
  }

  // Fetch jobs from Lever API
  private static async fetchFromLever(companyName: string): Promise<ATSResponse> {
    const identifiers = this.generateCompanyIdentifiers(companyName);
    
    for (const identifier of identifiers) {
      try {
        const url = `${this.ATS_APIS.lever}/${identifier}`;
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          const jobs = this.parseLeverJobs(data || [], companyName);
          return { success: true, jobs, source: 'Lever' };
        }
      } catch (error) {
        console.warn(`Lever API failed for ${identifier}:`, error);
      }
    }
    
    return { success: false, jobs: [], source: 'Lever' };
  }

  // Fetch jobs from Workable API
  private static async fetchFromWorkable(companyName: string): Promise<ATSResponse> {
    const identifiers = this.generateCompanyIdentifiers(companyName);
    
    for (const identifier of identifiers) {
      try {
        const url = `https://${identifier}.workable.com/spi/v3/jobs`;
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          const jobs = this.parseWorkableJobs(data.jobs || [], companyName);
          return { success: true, jobs, source: 'Workable' };
        }
      } catch (error) {
        console.warn(`Workable API failed for ${identifier}:`, error);
      }
    }
    
    return { success: false, jobs: [], source: 'Workable' };
  }

  // Fetch jobs from Ashby API
  private static async fetchFromAshby(companyName: string): Promise<ATSResponse> {
    const identifiers = this.generateCompanyIdentifiers(companyName);
    
    for (const identifier of identifiers) {
      try {
        const url = `${this.ATS_APIS.ashby}/${identifier}?includeCompensation=true`;
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          const jobs = this.parseAshbyJobs(data.jobs || [], companyName);
          return { success: true, jobs, source: 'Ashby' };
        }
      } catch (error) {
        console.warn(`Ashby API failed for ${identifier}:`, error);
      }
    }
    
    return { success: false, jobs: [], source: 'Ashby' };
  }

  // Parse Greenhouse job data
  private static parseGreenhouseJobs(jobs: any[], companyName: string): JobResult[] {
    return jobs.map(job => ({
      title: job.title || 'Untitled Position',
      count: '1',
      location: job.location?.name || job.offices?.[0]?.name || 'Location not specified',
      sourceUrl: job.absolute_url || `https://boards.greenhouse.io/${companyName}`,
      salary: this.extractSalary(job.content),
      datePosted: this.formatDate(job.updated_at),
      jobType: job.metadata?.employment_type || 'Full-time',
      company: companyName,
      atsSource: 'Greenhouse'
    }));
  }

  // Parse Lever job data
  private static parseLeverJobs(jobs: any[], companyName: string): JobResult[] {
    return jobs.map(job => ({
      title: job.text || 'Untitled Position',
      count: '1',
      location: job.categories?.location || job.workplaceType || 'Location not specified',
      sourceUrl: job.hostedUrl || job.applyUrl || `https://jobs.lever.co/${companyName}`,
      salary: job.salaryDescription || undefined,
      datePosted: this.formatDate(job.createdAt),
      jobType: job.categories?.commitment || job.workplaceType || 'Full-time',
      company: companyName,
      atsSource: 'Lever'
    }));
  }

  // Parse Workable job data
  private static parseWorkableJobs(jobs: any[], companyName: string): JobResult[] {
    return jobs.map(job => ({
      title: job.title || 'Untitled Position',
      count: '1',
      location: job.location?.city || job.location?.country || 'Location not specified',
      sourceUrl: job.url || `https://${companyName}.workable.com`,
      salary: job.salary || undefined,
      datePosted: this.formatDate(job.published_on),
      jobType: job.type || 'Full-time',
      company: companyName,
      atsSource: 'Workable'
    }));
  }

  // Parse Ashby job data  
  private static parseAshbyJobs(jobs: any[], companyName: string): JobResult[] {
    return jobs.map(job => ({
      title: job.title || 'Untitled Position',
      count: '1',
      location: job.locationName || job.primaryLocation?.locationName || 'Location not specified',
      sourceUrl: job.jobUrl || `https://jobs.ashbyhq.com/${companyName}`,
      salary: job.compensationTierSummary || undefined,
      datePosted: this.formatDate(job.publishedDate),
      jobType: job.employmentType || 'Full-time',
      company: companyName,
      atsSource: 'Ashby'
    }));
  }

  // Extract salary information from job content
  private static extractSalary(content: string): string | undefined {
    if (!content) return undefined;
    
    const salaryPatterns = [
      /\$[\d,]+(?:\s*-\s*\$?[\d,]+)?(?:\s*(?:per\s+year|\/year|annually|pa))?/i,
      /[\d,]+k(?:\s*-\s*[\d,]+k)?(?:\s*(?:per\s+year|\/year|annually|pa))?/i,
    ];
    
    for (const pattern of salaryPatterns) {
      const match = content.match(pattern);
      if (match) return match[0];
    }
    
    return undefined;
  }

  // Format date for display
  private static formatDate(dateStr: string): string | undefined {
    if (!dateStr) return undefined;
    
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      return `${Math.floor(diffDays / 30)} months ago`;
    } catch {
      return undefined;
    }
  }

  // Fallback: Provide direct links to company career pages
  private static async fetchFromCareerPage(companyName: string): Promise<ATSResponse> {
    const companyLower = companyName.toLowerCase();
    
    // Known major company career page mappings
    const knownCareerPages: Record<string, { url: string; name: string }> = {
      'google': { url: 'https://careers.google.com', name: 'Google' },
      'apple': { url: 'https://jobs.apple.com', name: 'Apple' },
      'microsoft': { url: 'https://careers.microsoft.com', name: 'Microsoft' },
      'meta': { url: 'https://careers.meta.com', name: 'Meta' },
      'facebook': { url: 'https://careers.meta.com', name: 'Meta (Facebook)' },
      'amazon': { url: 'https://amazon.jobs', name: 'Amazon' },
      'netflix': { url: 'https://jobs.netflix.com', name: 'Netflix' },
      'tesla': { url: 'https://careers.tesla.com', name: 'Tesla' },
      'uber': { url: 'https://careers.uber.com', name: 'Uber' },
      'airbnb': { url: 'https://careers.airbnb.com', name: 'Airbnb' },
      'spotify': { url: 'https://careers.spotify.com', name: 'Spotify' },
      'stripe': { url: 'https://stripe.com/jobs', name: 'Stripe' },
      'shopify': { url: 'https://careers.shopify.com', name: 'Shopify' },
      'salesforce': { url: 'https://careers.salesforce.com', name: 'Salesforce' },
      'oracle': { url: 'https://careers.oracle.com', name: 'Oracle' },
      'ibm': { url: 'https://careers.ibm.com', name: 'IBM' },
      'intel': { url: 'https://careers.intel.com', name: 'Intel' },
      'nvidia': { url: 'https://careers.nvidia.com', name: 'NVIDIA' },
      'adobe': { url: 'https://careers.adobe.com', name: 'Adobe' },
      'zoom': { url: 'https://careers.zoom.us', name: 'Zoom' },
    };

    const knownCompany = knownCareerPages[companyLower];
    
    if (knownCompany) {
      return {
        success: true,
        jobs: [{
          title: 'Various Open Positions',
          count: 'Multiple',
          location: 'Multiple Locations & Remote',
          sourceUrl: knownCompany.url,
          datePosted: 'Updated regularly',
          jobType: 'Various (Full-time, Part-time, Contract)',
          company: knownCompany.name,
          atsSource: 'Career Page'
        }],
        source: 'Career Page'
      };
    }

    // For unknown companies, provide generic career page suggestions
    const possibleUrls = [
      `https://careers.${companyLower}.com`,
      `https://jobs.${companyLower}.com`,
      `https://${companyLower}.com/careers`,
      `https://${companyLower}.com/jobs`
    ];

    return {
      success: true,
      jobs: [{
        title: 'Check Career Page',
        count: 'Unknown',
        location: 'Visit career page for details',
        sourceUrl: possibleUrls[0], // Default to careers.company.com
        datePosted: 'Check career page',
        jobType: 'Visit career page',
        company: companyName,
        atsSource: 'Career Page Suggestion'
      }],
      source: 'Career Page Suggestion'
    };
  }

  // Main method to fetch jobs from all ATS platforms
  public static async fetchJobsForCompany(companyName: string): Promise<{
    success: boolean;
    jobs: JobResult[];
    sources: string[];
    errors?: string[];
  }> {
    console.log(`Fetching jobs for company: ${companyName}`);
    
    const fetchPromises = [
      this.fetchFromGreenhouse(companyName),
      this.fetchFromLever(companyName),
      this.fetchFromWorkable(companyName),
      this.fetchFromAshby(companyName),
    ];

    try {
      const results = await Promise.allSettled(fetchPromises);
      const allJobs: JobResult[] = [];
      const successfulSources: string[] = [];
      const errors: string[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          allJobs.push(...result.value.jobs);
          successfulSources.push(result.value.source);
        } else if (result.status === 'rejected') {
          errors.push(`${['Greenhouse', 'Lever', 'Workable', 'Ashby'][index]}: ${result.reason}`);
        }
      });

      // If no ATS results found, try career page fallback
      if (allJobs.length === 0) {
        console.log('No ATS results found, trying career page fallback...');
        const careerPageResult = await this.fetchFromCareerPage(companyName);
        if (careerPageResult.success) {
          allJobs.push(...careerPageResult.jobs);
          successfulSources.push(careerPageResult.source);
        }
      }

      // Remove duplicates based on title and location
      const uniqueJobs = this.removeDuplicateJobs(allJobs);

      return {
        success: uniqueJobs.length > 0,
        jobs: uniqueJobs,
        sources: successfulSources,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      console.error('Error fetching jobs:', error);
      return {
        success: false,
        jobs: [],
        sources: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // Remove duplicate jobs based on title and location similarity
  private static removeDuplicateJobs(jobs: JobResult[]): JobResult[] {
    const seen = new Set<string>();
    return jobs.filter(job => {
      const key = `${job.title.toLowerCase().trim()}-${job.location.toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}