import { ApifyJobService } from './ApifyJobService';
import { JSearchService } from './JSearchService';

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

interface APIConfig {
  serpApiKey?: string;
  diffbotToken?: string;
  apifyToken?: string;
}

interface SearchResult {
  success: boolean;
  jobs: JobResult[];
  sources: string[];
  totalFound: number;
  errors?: string[];
}

export class MultiSourceJobService {
  private static config: APIConfig = {};

  // Store API keys
  static setAPIKeys(config: APIConfig) {
    this.config = { ...this.config, ...config };
    // Store in localStorage for persistence
    localStorage.setItem('job_search_api_config', JSON.stringify(this.config));
    
    // Also configure ApifyJobService if token is provided
    if (config.apifyToken) {
      ApifyJobService.setAPIKey(config.apifyToken);
    }
  }

  // Load API keys from localStorage
  static loadAPIKeys(): APIConfig {
    try {
      const stored = localStorage.getItem('job_search_api_config');
      if (stored) {
        this.config = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load API config:', error);
    }
    return this.config;
  }

  // 1. Google Jobs via SerpApi (100 free searches/month)
  private static async searchGoogleJobs(companyName: string): Promise<{ jobs: JobResult[], source: string }> {
    if (!this.config.serpApiKey) {
      return { jobs: [], source: 'Google Jobs (SerpApi)' };
    }

    try {
      const query = `${companyName} jobs`;
      const url = `https://serpapi.com/search.json?engine=google_jobs&q=${encodeURIComponent(query)}&api_key=${this.config.serpApiKey}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`SerpApi failed: ${response.status}`);
      
      const data = await response.json();
      const jobs: JobResult[] = [];

      if (data.jobs_results) {
        data.jobs_results.slice(0, 10).forEach((job: any) => {
          jobs.push({
            title: job.title || 'Unknown Position',
            count: '1',
            location: job.location || 'Location not specified',
            sourceUrl: job.related_links?.[0]?.link || job.apply_options?.[0]?.link || '#',
            salary: job.detected_extensions?.salary || undefined,
            datePosted: job.detected_extensions?.posted_at || undefined,
            jobType: job.detected_extensions?.schedule_type || 'Full-time',
            company: job.company_name || companyName,
            atsSource: 'Google Jobs',
            description: job.description?.substring(0, 200) || undefined,
          });
        });
      }

      return { jobs, source: 'Google Jobs (SerpApi)' };
    } catch (error) {
      console.error('Google Jobs search failed:', error);
      return { jobs: [], source: 'Google Jobs (SerpApi)' };
    }
  }

  // 2. Company Career Pages via Diffbot (10K free extractions/month)
  private static async searchCareerPages(companyName: string): Promise<{ jobs: JobResult[], source: string }> {
    if (!this.config.diffbotToken) {
      return { jobs: [], source: 'Company Careers (Diffbot)' };
    }

    try {
      // Common career page patterns
      const careerUrls = [
        `https://careers.${companyName.toLowerCase()}.com`,
        `https://jobs.${companyName.toLowerCase()}.com`,
        `https://${companyName.toLowerCase()}.com/careers`,
        `https://${companyName.toLowerCase()}.com/jobs`,
      ];

      const jobs: JobResult[] = [];

      // Try each URL with Diffbot
      for (const url of careerUrls.slice(0, 2)) { // Limit to 2 URLs to conserve quota
        try {
          const diffbotUrl = `https://api.diffbot.com/v3/analyze?token=${this.config.diffbotToken}&url=${encodeURIComponent(url)}&fields=objects.title,objects.location,objects.summary,objects.skills`;
          
          const response = await fetch(diffbotUrl);
          if (!response.ok) continue;
          
          const data = await response.json();
          
          if (data.objects) {
            data.objects.slice(0, 5).forEach((job: any) => {
              if (job.title) {
                jobs.push({
                  title: job.title,
                  count: '1',
                  location: job.location || 'Location not specified',
                  sourceUrl: url,
                  company: companyName,
                  atsSource: 'Company Career Page',
                  description: job.summary?.substring(0, 200) || undefined,
                  skills: job.skills || undefined,
                });
              }
            });
          }
          
          if (jobs.length > 0) break; // Found jobs, no need to try more URLs
        } catch (error) {
          console.warn(`Diffbot failed for ${url}:`, error);
        }
      }

      return { jobs, source: 'Company Careers (Diffbot)' };
    } catch (error) {
      console.error('Diffbot career search failed:', error);
      return { jobs: [], source: 'Company Careers (Diffbot)' };
    }
  }

  // 3. LinkedIn Jobs via Apify Actor
  private static async searchLinkedInJobs(companyName: string): Promise<{ jobs: JobResult[], source: string }> {
    if (!this.config.apifyToken) {
      return { jobs: [], source: 'LinkedIn Jobs (Apify)' };
    }

    try {
      // Use Apify's LinkedIn Jobs actor
      const actorId = 'apify/linkedin-jobs-scraper';
      const runInput = {
        queries: [`${companyName} jobs`],
        maxResults: 10,
        country: 'US',
      };

      // Start the actor run
      const runResponse = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${this.config.apifyToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(runInput),
      });

      if (!runResponse.ok) throw new Error(`Apify run failed: ${runResponse.status}`);
      
      const runData = await runResponse.json();
      const runId = runData.data.id;

      // Wait for completion (simplified - in production, use webhooks)
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second wait

      // Get results
      const resultsResponse = await fetch(`https://api.apify.com/v2/datasets/${runData.data.defaultDatasetId}/items?token=${this.config.apifyToken}`);
      if (!resultsResponse.ok) throw new Error(`Failed to get results: ${resultsResponse.status}`);
      
      const results = await resultsResponse.json();
      const jobs: JobResult[] = [];

      results.slice(0, 10).forEach((job: any) => {
        if (job.title) {
          jobs.push({
            title: job.title,
            count: '1',
            location: job.location || 'Location not specified',
            sourceUrl: job.url || '#',
            salary: job.salary || undefined,
            datePosted: job.postedTime || undefined,
            jobType: job.workplace || 'Full-time',
            company: job.company || companyName,
            atsSource: 'LinkedIn',
            description: job.description?.substring(0, 200) || undefined,
          });
        }
      });

      return { jobs, source: 'LinkedIn Jobs (Apify)' };
    } catch (error) {
      console.error('LinkedIn search failed:', error);
      return { jobs: [], source: 'LinkedIn Jobs (Apify)' };
    }
  }

  // Mock job board data for demo (since direct API calls have CORS issues)
  private static async getMockJobBoardData(companyName: string): Promise<{ jobs: JobResult[], source: string }> {
    // Return some sample data for demonstration
    const sampleJobs: JobResult[] = [
      {
        title: `Software Engineer at ${companyName}`,
        count: '1',
        location: 'San Francisco, CA',
        sourceUrl: `https://${companyName.toLowerCase().replace(/\s+/g, '')}.com/careers`,
        company: companyName,
        atsSource: 'Company Careers',
        description: 'Sample job posting for demonstration',
        salary: '$100,000 - $150,000',
        jobType: 'Full-time'
      }
    ];

    return { jobs: sampleJobs, source: 'Demo Data' };
  }

  // Remove duplicate jobs and filter out generic career page results
  private static removeDuplicateJobs(jobs: JobResult[]): JobResult[] {
    const seen = new Set<string>();
    
    // Filter out generic career page suggestions
    const filteredJobs = jobs.filter(job => {
      const title = job.title.toLowerCase();
      const isGeneric = 
        title.includes('join us') ||
        title.includes('careers at') ||
        title.includes('various open positions') ||
        title.includes('check career page') ||
        title.includes('career opportunity') ||
        title.includes('multiple positions') ||
        title === 'position available' ||
        title === 'job opening' ||
        title === 'untitled position' ||
        job.count === 'multiple' ||
        job.count === 'various' ||
        job.count === 'unknown';
      
      return !isGeneric;
    });
    
    // Remove duplicates from the filtered results
    return filteredJobs.filter(job => {
      const key = `${job.title.toLowerCase().trim()}-${job.location.toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Call edge function with timeout
  private static async callEdgeFunctionWithTimeout(functionName: string, payload: any, timeout: number = 3000): Promise<{ jobs: JobResult[], source: string }> {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      console.log(`🔍 Calling edge function: ${functionName} with payload:`, payload);
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), timeout);
      });

      const apiPromise = supabase.functions.invoke(functionName, {
        body: payload
      });

      const { data, error } = await Promise.race([apiPromise, timeoutPromise]);

      if (error) {
        console.error(`❌ Edge function ${functionName} error:`, error);
        throw error;
      }

      console.log(`✅ Edge function ${functionName} response:`, data);
      return data || { jobs: [], source: 'Unknown' };
    } catch (error) {
      console.error(`🚨 Edge function ${functionName} failed:`, error);
      return { jobs: [], source: 'Unknown' };
    }
  }

  // Main search method using JSearch API as primary source
  public static async searchAllSources(companyName: string): Promise<SearchResult> {
    console.log(`🚀 Starting JSearch-powered job search for: ${companyName}`);
    
    const allJobs: JobResult[] = [];
    const sources: string[] = [];
    const errors: string[] = [];

    // 1. PRIMARY: Try JSearch API first (Google Jobs via RapidAPI)
    console.log('🎯 Step 1: Trying JSearch API (Primary)...');
    try {
      const jsearchResult = await JSearchService.searchJobs(companyName);
      
      if (jsearchResult.success && jsearchResult.jobs.length > 0) {
        allJobs.push(...jsearchResult.jobs);
        sources.push(...jsearchResult.sources);
        console.log(`✅ JSearch API (Primary): Found ${jsearchResult.jobs.length} jobs`);
        
        // Remove duplicates and return early if we have good results
        const uniqueJobs = this.removeDuplicateJobs(allJobs);
        if (uniqueJobs.length > 0) {
          return {
            success: true,
            jobs: uniqueJobs,
            sources,
            totalFound: uniqueJobs.length,
          };
        }
      } else {
        console.log('○ JSearch API: No jobs found, continuing to fallback methods...');
        if (jsearchResult.errors) {
          errors.push(...jsearchResult.errors);
        }
      }
    } catch (jsearchError) {
      console.warn('JSearch API failed:', jsearchError);
      errors.push(`JSearch API: ${jsearchError instanceof Error ? jsearchError.message : 'Failed'}`);
    }

    console.log('🔄 Step 2: JSearch didn\'t return results, trying backup methods...');

    // For known companies where APIs often fail, try free methods
    const knownCompanies = ['netflix', 'google', 'apple', 'microsoft', 'meta', 'amazon', 'tesla'];
    const isKnownCompany = knownCompanies.some(known => 
      companyName.toLowerCase().includes(known)
    );

    if (isKnownCompany) {
      console.log(`🎯 Known major company detected: ${companyName} - trying free methods`);
      
      // Try free methods for known companies
      try {
        const { CreativeJobSearchService } = await import('./CreativeJobSearchService');
        const creativeResult = await CreativeJobSearchService.searchWithCreativeMethods(companyName, {
          includeRSS: true,
          includeFreeAPIs: true,
          includeSocialMedia: true
        });
        
        if (creativeResult.success && creativeResult.jobs.length > 0) {
          allJobs.push(...creativeResult.jobs);
          sources.push(...creativeResult.sources.map(s => `${s} (Free)`));
          console.log(`✅ Creative Free Methods: Found ${creativeResult.jobs.length} jobs`);
        }
      } catch (creativeError) {
        console.warn('Creative free methods failed:', creativeError);
      }

      // Also try ATS for known companies
      try {
        const { ATSService } = await import('./ATSService');
        const atsResult = await ATSService.fetchJobsForCompany(companyName);
        
        if (atsResult.success && atsResult.jobs.length > 0) {
          allJobs.push(...atsResult.jobs);
          sources.push(...atsResult.sources.map(s => `${s} (Free ATS)`));
          console.log(`✅ ATS Free Methods: Found ${atsResult.jobs.length} jobs`);
        }
      } catch (atsError) {
        console.warn('ATS methods failed:', atsError);
      }
    }

    // 2. FALLBACK: Try edge functions if still no results
    if (allJobs.length === 0) {
      console.log('🔄 Step 3: Trying edge function fallbacks...');
      
      const searchPromises = [
        { name: 'Google Jobs', promise: this.callEdgeFunctionWithTimeout('search-google-jobs', { companyName }, 5000) },
        { name: 'Career Pages', promise: this.callEdgeFunctionWithTimeout('search-career-pages', { companyName }, 8000) },
        { name: 'LinkedIn Jobs', promise: this.callEdgeFunctionWithTimeout('search-linkedin-jobs', { companyName }, 10000) },
      ];

      const results = await Promise.allSettled(searchPromises.map(p => p.promise));
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const { jobs, source } = result.value;
          if (jobs.length > 0) {
            allJobs.push(...jobs);
            sources.push(source);
            console.log(`✓ ${searchPromises[index].name}: Found ${jobs.length} jobs`);
          } else {
            console.log(`○ ${searchPromises[index].name}: No jobs found`);
          }
        } else {
          const errorMsg = `${searchPromises[index].name}: ${result.reason?.message || 'Failed'}`;
          errors.push(errorMsg);
          console.log(`✗ ${errorMsg}`);
        }
      });
    }

    // 3. LAST RESORT: Try comprehensive free methods if still no results
    if (allJobs.length === 0) {
      console.log('🔄 Step 4: Last resort - trying comprehensive free methods...');
      
      // Try Creative Free Methods (RSS, free APIs, etc.)
      if (!isKnownCompany) { // Only if not already tried above
        try {
          const { CreativeJobSearchService } = await import('./CreativeJobSearchService');
          const creativeResult = await CreativeJobSearchService.searchWithCreativeMethods(companyName, {
            includeRSS: true,
            includeFreeAPIs: true,
            includeSocialMedia: true
          });
          
          if (creativeResult.success && creativeResult.jobs.length > 0) {
            allJobs.push(...creativeResult.jobs);
            sources.push(...creativeResult.sources.map(s => `${s} (Free)`));
            console.log(`✅ Creative Free Methods (Last Resort): Found ${creativeResult.jobs.length} jobs`);
          }
        } catch (creativeError) {
          console.warn('Creative free methods failed:', creativeError);
          errors.push('Creative Free Methods: Failed to load');
        }
      }

      // Try ATS fallback if not already tried
      if (allJobs.length === 0 && !isKnownCompany) {
        try {
          const { ATSService } = await import('./ATSService');
          const atsResult = await ATSService.fetchJobsForCompany(companyName);
          
          if (atsResult.success && atsResult.jobs.length > 0) {
            allJobs.push(...atsResult.jobs);
            sources.push(...atsResult.sources.map(s => `${s} (Free ATS)`));
            console.log(`✅ ATS Free Fallback: Found ${atsResult.jobs.length} jobs`);
          }
        } catch (atsError) {
          console.warn('ATS fallback failed:', atsError);
          errors.push('ATS Fallback: Failed to load');
        }
      }

      // Try Comprehensive Apify (uses free $5 credits) as absolute last resort
      if (allJobs.length === 0) {
        try {
          const apifyResult = await ApifyJobService.quickApifySearch(companyName);
          
          if (apifyResult.success && apifyResult.jobs.length > 0) {
            allJobs.push(...apifyResult.jobs);
            sources.push(...apifyResult.sources.map(s => `${s} (Free Apify)`));
            console.log(`✅ Comprehensive Apify (Last Resort): Found ${apifyResult.jobs.length} jobs`);
          }
        } catch (apifyError) {
          console.warn('Comprehensive Apify failed:', apifyError);
          errors.push('Comprehensive Apify: Failed to load');
        }
      }
    }

    // Remove duplicates and filter out generic results
    const uniqueJobs = this.removeDuplicateJobs(allJobs);

    return {
      success: uniqueJobs.length > 0,
      jobs: uniqueJobs,
      sources,
      totalFound: uniqueJobs.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // Apify-only comprehensive job search (alternative to edge functions)
  public static async searchWithApifyOnly(companyName: string, searchType: 'quick' | 'deep' = 'quick'): Promise<SearchResult> {
    console.log(`Apify-only job search (${searchType}) for: ${companyName}`);
    
    // Ensure ApifyJobService has the token
    this.loadAPIKeys();
    if (this.config.apifyToken && !ApifyJobService.loadAPIKey()) {
      ApifyJobService.setAPIKey(this.config.apifyToken);
    }

    if (searchType === 'quick') {
      return await ApifyJobService.quickApifySearch(companyName);
    } else {
      return await ApifyJobService.deepApifySearch(companyName);
    }
  }

  // Hybrid search combining edge functions and comprehensive Apify
  public static async searchHybrid(companyName: string): Promise<SearchResult> {
    console.log(`Hybrid job search for: ${companyName}`);
    
    const allJobs: JobResult[] = [];
    const sources: string[] = [];
    const errors: string[] = [];

    // Run both approaches in parallel
    const [edgeFunctionResults, apifyResults] = await Promise.allSettled([
      this.searchAllSources(companyName),
      this.searchWithApifyOnly(companyName, 'quick')
    ]);

    // Combine results from edge functions
    if (edgeFunctionResults.status === 'fulfilled') {
      const result = edgeFunctionResults.value;
      allJobs.push(...result.jobs);
      sources.push(...result.sources);
      if (result.errors) errors.push(...result.errors);
    } else {
      errors.push(`Edge functions: ${edgeFunctionResults.reason?.message || 'Failed'}`);
    }

    // Combine results from comprehensive Apify
    if (apifyResults.status === 'fulfilled') {
      const result = apifyResults.value;
      allJobs.push(...result.jobs);
      sources.push(...result.sources.map(s => `${s} (Comprehensive)`));
      if (result.errors) errors.push(...result.errors);
    } else {
      errors.push(`Apify comprehensive: ${apifyResults.reason?.message || 'Failed'}`);
    }

    // Remove duplicates
    const uniqueJobs = this.removeDuplicateJobs(allJobs);

    return {
      success: uniqueJobs.length > 0,
      jobs: uniqueJobs,
      sources,
      totalFound: uniqueJobs.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // Get available API status including comprehensive Apify methods
  public static getAPIStatus(): { [key: string]: boolean } {
    this.loadAPIKeys();
    const edgeFunctionStatus = {
      'Google Jobs (SerpApi)': !!this.config.serpApiKey,
      'Career Pages (Diffbot)': !!this.config.diffbotToken,
      'LinkedIn (Apify)': !!this.config.apifyToken,
    };

    const apifyStatus = ApifyJobService.getApifyStatus();
    
    return {
      ...edgeFunctionStatus,
      '--- Comprehensive Apify ---': false, // Separator
      ...apifyStatus,
    };
  }
}