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

interface ApifyActorConfig {
  actorId: string;
  name: string;
  inputMapper: (companyName: string) => any;
  outputMapper: (result: any) => JobResult[];
}

interface SearchResult {
  success: boolean;
  jobs: JobResult[];
  sources: string[];
  totalFound: number;
  errors?: string[];
}

export class ApifyJobService {
  private static API_KEY_STORAGE_KEY = 'apify_api_key';
  private static apifyToken: string | null = null;

  // Store Apify API token
  static setAPIKey(token: string): void {
    this.apifyToken = token;
    localStorage.setItem(this.API_KEY_STORAGE_KEY, token);
    console.log('Apify API token saved successfully');
  }

  // Load API token from localStorage
  static loadAPIKey(): string | null {
    if (!this.apifyToken) {
      this.apifyToken = localStorage.getItem(this.API_KEY_STORAGE_KEY);
    }
    return this.apifyToken;
  }

  // Test Apify API key
  static async testAPIKey(token: string): Promise<boolean> {
    try {
      const response = await fetch(`https://api.apify.com/v2/acts?token=${token}&limit=1`);
      return response.ok;
    } catch (error) {
      console.error('Error testing Apify API key:', error);
      return false;
    }
  }

  // Pre-built job scraping actors configuration
  private static getJobScrapingActors(): ApifyActorConfig[] {
    return [
      {
        actorId: 'bebity/linkedin-jobs-scraper',
        name: 'LinkedIn Jobs',
        inputMapper: (companyName: string) => ({
          queries: [`${companyName} jobs`],
          maxResults: 10,
          location: 'United States'
        }),
        outputMapper: (results: any[]) => results.map(job => ({
          title: job.title || 'Position Available',
          count: '1',
          location: job.location || 'Location not specified',
          sourceUrl: job.url || job.link || '#',
          salary: job.salary || undefined,
          datePosted: job.postedTime || job.datePosted || undefined,
          jobType: job.workplace || job.employmentType || 'Full-time',
          company: job.company || job.companyName || 'Company',
          atsSource: 'LinkedIn',
          description: job.description?.substring(0, 200),
          skills: job.skills || job.requiredSkills || undefined
        }))
      },
      {
        actorId: 'curious_coder/indeed-scraper',
        name: 'Indeed Jobs',
        inputMapper: (companyName: string) => ({
          queries: [`${companyName}`],
          maxItems: 10,
          country: 'US'
        }),
        outputMapper: (results: any[]) => results.map(job => ({
          title: job.title || job.jobTitle || 'Job Opening',
          count: '1',
          location: job.location || 'Location not specified',
          sourceUrl: job.url || job.jobUrl || '#',
          salary: job.salary || job.salaryText || undefined,
          datePosted: job.postedDate || job.datePosted || undefined,
          jobType: job.jobType || 'Full-time',
          company: job.company || job.companyName || 'Company',
          atsSource: 'Indeed',
          description: job.description?.substring(0, 200),
          skills: job.skills || undefined
        }))
      },
      {
        actorId: 'codemaverick/naukri-job-scraper-latest',
        name: 'Naukri Jobs',
        inputMapper: (companyName: string) => ({
          searchQuery: companyName,
          maxResults: 10
        }),
        outputMapper: (results: any[]) => results.map(job => ({
          title: job.title || job.jobTitle || 'Position Available',
          count: '1',
          location: job.location || 'Location not specified',
          sourceUrl: job.url || job.jobUrl || '#',
          salary: job.salary || undefined,
          datePosted: job.postedDate || job.datePosted || undefined,
          jobType: job.jobType || 'Full-time',
          company: job.company || job.companyName || 'Company',
          atsSource: 'Naukri',
          description: job.description?.substring(0, 200),
          skills: job.skills || job.tags || undefined
        }))
      }
    ];
  }

  // Generic scraper actors for careers pages
  private static getGenericScrapers(): ApifyActorConfig[] {
    return [
      {
        actorId: 'apify/cheerio-scraper',
        name: 'Cheerio Scraper',
        inputMapper: (companyName: string) => {
          const companyLower = companyName.toLowerCase().replace(/\s+/g, '');
          return {
            startUrls: [
              `https://careers.${companyLower}.com`,
              `https://jobs.${companyLower}.com`,
              `https://${companyLower}.com/careers`,
              `https://${companyLower}.com/jobs`
            ],
            pageFunction: `
              async function pageFunction(context) {
                const { $ } = context;
                const jobs = [];
                
                // Common job listing selectors
                const jobSelectors = [
                  '.job-listing', '.job-item', '.position', '.opening',
                  '[data-job]', '.career-opportunity', '.job-post'
                ];
                
                for (const selector of jobSelectors) {
                  $(selector).each((i, el) => {
                    const $el = $(el);
                    const title = $el.find('h1, h2, h3, .title, .job-title').first().text().trim();
                    const location = $el.find('.location, .job-location').first().text().trim();
                    const link = $el.find('a').first().attr('href');
                    
                    if (title) {
                      jobs.push({
                        title,
                        location: location || 'Location not specified',
                        url: link ? new URL(link, context.request.url).href : context.request.url,
                        company: '${companyName}',
                        source: 'Company Career Page'
                      });
                    }
                  });
                  
                  if (jobs.length > 0) break;
                }
                
                // Try JSON-LD structured data
                if (jobs.length === 0) {
                  $('script[type="application/ld+json"]').each((i, el) => {
                    try {
                      const data = JSON.parse($(el).html());
                      if (data['@type'] === 'JobPosting' || (Array.isArray(data) && data.some(item => item['@type'] === 'JobPosting'))) {
                        const jobPostings = Array.isArray(data) ? data.filter(item => item['@type'] === 'JobPosting') : [data];
                        
                        jobPostings.forEach(posting => {
                          jobs.push({
                            title: posting.title || posting.name,
                            location: posting.jobLocation?.address?.addressLocality || 'Location not specified',
                            url: posting.url || context.request.url,
                            company: posting.hiringOrganization?.name || '${companyName}',
                            source: 'Company Career Page (JSON-LD)',
                            salary: posting.baseSalary?.value || undefined,
                            datePosted: posting.datePosted || undefined,
                            description: posting.description?.substring(0, 200) || undefined
                          });
                        });
                      }
                    } catch (e) {
                      // Ignore JSON parsing errors
                    }
                  });
                }
                
                return jobs;
              }
            `
          };
        },
        outputMapper: (results: any[]) => results.map(job => ({
          title: job.title || 'Career Opportunity',
          count: '1',
          location: job.location || 'Location not specified',
          sourceUrl: job.url || '#',
          salary: job.salary || undefined,
          datePosted: job.datePosted || undefined,
          jobType: 'Full-time',
          company: job.company || 'Company',
          atsSource: job.source || 'Career Page',
          description: job.description
        }))
      },
      {
        actorId: 'apify/web-scraper',
        name: 'Web Scraper',
        inputMapper: (companyName: string) => {
          const companyLower = companyName.toLowerCase().replace(/\s+/g, '');
          return {
            startUrls: [
              `https://careers.${companyLower}.com`,
              `https://${companyLower}.com/careers`
            ],
            pageFunction: `
              async function pageFunction(context) {
                const { page } = context;
                
                // Wait for content to load
                await page.waitForTimeout(2000);
                
                const jobs = await page.evaluate(() => {
                  const jobElements = document.querySelectorAll(
                    '.job-listing, .job-item, .position, .opening, [data-job], .career-opportunity'
                  );
                  
                  return Array.from(jobElements).map(el => {
                    const title = el.querySelector('h1, h2, h3, .title, .job-title')?.textContent?.trim();
                    const location = el.querySelector('.location, .job-location')?.textContent?.trim();
                    const link = el.querySelector('a')?.href;
                    
                    return {
                      title: title || 'Position Available',
                      location: location || 'Location not specified',
                      url: link || window.location.href,
                      company: '${companyName}',
                      source: 'Company Career Page (JS)'
                    };
                  }).filter(job => job.title !== 'Position Available');
                });
                
                return jobs;
              }
            `
          };
        },
        outputMapper: (results: any[]) => results.map(job => ({
          title: job.title || 'Career Opportunity',
          count: '1',
          location: job.location || 'Location not specified',
          sourceUrl: job.url || '#',
          company: job.company || 'Company',
          atsSource: job.source || 'Career Page (JS)',
          jobType: 'Full-time'
        }))
      }
    ];
  }

  // Run a single Apify actor
  private static async runApifyActor(
    actorConfig: ApifyActorConfig,
    companyName: string,
    timeout: number = 60000
  ): Promise<{ jobs: JobResult[], source: string }> {
    const token = this.loadAPIKey();
    if (!token) {
      return { jobs: [], source: actorConfig.name };
    }

    try {
      console.log(`🚀 Starting Apify actor: ${actorConfig.name}`);
      
      // Start the actor run
      const runResponse = await fetch(`https://api.apify.com/v2/acts/${actorConfig.actorId}/runs?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actorConfig.inputMapper(companyName))
      });

      if (!runResponse.ok) {
        throw new Error(`Failed to start actor: ${runResponse.status}`);
      }

      const runData = await runResponse.json();
      const runId = runData.data.id;
      const datasetId = runData.data.defaultDatasetId;

      console.log(`⏳ Waiting for actor ${actorConfig.name} to complete...`);

      // Wait for completion with timeout
      const startTime = Date.now();
      while (Date.now() - startTime < timeout) {
        const statusResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
        const statusData = await statusResponse.json();
        
        if (statusData.data.status === 'SUCCEEDED') {
          // Get results from dataset
          const resultsResponse = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}`);
          const results = await resultsResponse.json();
          
          const jobs = actorConfig.outputMapper(results);
          console.log(`✅ ${actorConfig.name}: Found ${jobs.length} jobs`);
          
          return { jobs, source: actorConfig.name };
        } else if (statusData.data.status === 'FAILED') {
          throw new Error(`Actor run failed: ${statusData.data.statusMessage}`);
        }
        
        // Wait before checking again
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      throw new Error(`Actor run timed out after ${timeout}ms`);
    } catch (error) {
      console.error(`❌ Actor ${actorConfig.name} failed:`, error);
      return { jobs: [], source: actorConfig.name };
    }
  }

  // Main method to search using all Apify actors
  public static async searchAllApifyActors(
    companyName: string,
    options: {
      includePreBuilt?: boolean;
      includeGenericScrapers?: boolean;
      timeout?: number;
    } = {}
  ): Promise<SearchResult> {
    const token = this.loadAPIKey();
    if (!token) {
      return {
        success: false,
        jobs: [],
        sources: [],
        totalFound: 0,
        errors: ['Apify API token not configured']
      };
    }

    console.log(`🔍 Apify comprehensive search for: ${companyName}`);
    
    const allJobs: JobResult[] = [];
    const sources: string[] = [];
    const errors: string[] = [];

    const actors: ApifyActorConfig[] = [];
    
    // Add pre-built job scraping actors
    if (options.includePreBuilt !== false) {
      actors.push(...this.getJobScrapingActors());
    }
    
    // Add generic scrapers for company career pages
    if (options.includeGenericScrapers !== false) {
      actors.push(...this.getGenericScrapers());
    }

    // Run actors in parallel with some delay to avoid overwhelming
    const batchSize = 2; // Run 2 actors at a time
    const timeout = options.timeout || 60000;

    for (let i = 0; i < actors.length; i += batchSize) {
      const batch = actors.slice(i, i + batchSize);
      
      const batchPromises = batch.map(actor => 
        this.runApifyActor(actor, companyName, timeout)
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const { jobs, source } = result.value;
          if (jobs.length > 0) {
            allJobs.push(...jobs);
            sources.push(source);
          }
        } else {
          errors.push(`${batch[index].name}: ${result.reason?.message || 'Failed'}`);
        }
      });

      // Small delay between batches
      if (i + batchSize < actors.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Remove duplicates
    const uniqueJobs = this.removeDuplicates(allJobs);

    console.log(`🎯 Apify search completed: ${uniqueJobs.length} unique jobs from ${sources.length} sources`);

    return {
      success: uniqueJobs.length > 0,
      jobs: uniqueJobs,
      sources,
      totalFound: uniqueJobs.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // Remove duplicate jobs
  private static removeDuplicates(jobs: JobResult[]): JobResult[] {
    const seen = new Set<string>();
    return jobs.filter(job => {
      const key = `${job.title.toLowerCase().trim()}-${job.company.toLowerCase().trim()}-${job.location.toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Get available actors status
  public static getApifyStatus(): { [key: string]: boolean } {
    const hasToken = !!this.loadAPIKey();
    return {
      'LinkedIn Jobs (Apify)': hasToken,
      'Indeed Jobs (Apify)': hasToken,
      'Naukri Jobs (Apify)': hasToken,
      'Cheerio Scraper (Careers)': hasToken,
      'Web Scraper (Careers)': hasToken,
    };
  }

  // Quick search using only pre-built actors (faster)
  public static async quickApifySearch(companyName: string): Promise<SearchResult> {
    return this.searchAllApifyActors(companyName, {
      includePreBuilt: true,
      includeGenericScrapers: false,
      timeout: 30000 // Shorter timeout for quick search
    });
  }

  // Deep search using all available actors (comprehensive)
  public static async deepApifySearch(companyName: string): Promise<SearchResult> {
    return this.searchAllApifyActors(companyName, {
      includePreBuilt: true,
      includeGenericScrapers: true,
      timeout: 90000 // Longer timeout for comprehensive search
    });
  }
}