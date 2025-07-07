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

interface JSearchResponse {
  status: string;
  request_id: string;
  parameters?: any;
  data?: any[];
  error?: {
    message: string;
    code: number;
  };
}

interface SalaryData {
  location: string;
  job_title: string;
  min_salary: number;
  max_salary: number;
  median_salary: number;
  min_base_salary: number;
  max_base_salary: number;
  median_base_salary: number;
  min_additional_pay: number;
  max_additional_pay: number;
  median_additional_pay: number;
  salary_period: string;
  salary_currency: string;
  salary_count: number;
  salaries_updated_at: string;
  publisher_name: string;
  publisher_link: string;
  confidence: string;
}

interface SearchResult {
  success: boolean;
  jobs: JobResult[];
  sources: string[];
  totalFound: number;
  errors?: string[];
}

export class JSearchService {
  private static readonly API_KEY = 'a74070d437mshfbedf919e13b75cp12583cjsn6485aabb5415';
  private static readonly BASE_URL = 'https://jsearch.p.rapidapi.com';

  // Main job search method
  public static async searchJobs(companyName: string): Promise<SearchResult> {
    console.log(`🔍 JSearch API: Searching for jobs at ${companyName}`);
    
    try {
      const searchUrl = `${this.BASE_URL}/search`;
      const params = new URLSearchParams({
        query: `${companyName} jobs`,
        page: '1',
        num_pages: '1',
        date_posted: 'all',
        remote_jobs_only: 'false',
        employment_types: 'FULLTIME,PARTTIME,CONTRACTOR,INTERN',
        job_requirements: 'no_degree,under_3_years_experience,more_than_3_years_experience',
        country: 'us'
      });

      const response = await fetch(`${searchUrl}?${params}`, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': this.API_KEY,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`JSearch API failed: ${response.status} ${response.statusText}`);
      }

      const data: JSearchResponse = await response.json();
      
      if (data.status === 'ERROR') {
        throw new Error(data.error?.message || 'JSearch API returned error');
      }

      const jobs: JobResult[] = [];
      
      if (data.data && Array.isArray(data.data)) {
        data.data.forEach((job: any) => {
          jobs.push({
            title: job.job_title || 'Unknown Position',
            count: '1',
            location: job.job_city && job.job_state 
              ? `${job.job_city}, ${job.job_state}`
              : job.job_country || 'Location not specified',
            sourceUrl: job.job_apply_link || job.job_url || '#',
            salary: job.job_salary_currency && job.job_min_salary && job.job_max_salary
              ? `${job.job_salary_currency}${job.job_min_salary} - ${job.job_salary_currency}${job.job_max_salary}`
              : job.job_salary_period
              ? `Salary info available (${job.job_salary_period})`
              : undefined,
            datePosted: job.job_posted_at_datetime_utc || job.job_posted_at_timestamp
              ? new Date(job.job_posted_at_datetime_utc || job.job_posted_at_timestamp * 1000).toLocaleDateString()
              : undefined,
            jobType: job.job_employment_type || 'Full-time',
            company: job.employer_name || companyName,
            atsSource: 'JSearch (Google Jobs)',
            description: job.job_description 
              ? job.job_description.substring(0, 300) + (job.job_description.length > 300 ? '...' : '')
              : undefined,
            skills: job.job_required_skills || undefined,
          });
        });
      }

      console.log(`✅ JSearch API: Found ${jobs.length} jobs for ${companyName}`);
      
      return {
        success: jobs.length > 0,
        jobs,
        sources: ['JSearch (Google Jobs)'],
        totalFound: jobs.length,
      };

    } catch (error) {
      console.error('❌ JSearch API error:', error);
      return {
        success: false,
        jobs: [],
        sources: [],
        totalFound: 0,
        errors: [`JSearch API: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  // Get job details by ID
  public static async getJobDetails(jobId: string): Promise<any> {
    try {
      const response = await fetch(`${this.BASE_URL}/job-details?job_id=${jobId}`, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': this.API_KEY,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`JSearch job details failed: ${response.status}`);
      }

      const data: JSearchResponse = await response.json();
      return data.status === 'OK' ? data.data : null;
    } catch (error) {
      console.error('JSearch job details error:', error);
      return null;
    }
  }

  // Get salary estimates with proper typing
  public static async getSalaryEstimate(jobTitle: string, location: string): Promise<SalaryData[]> {
    try {
      const params = new URLSearchParams({
        job_title: jobTitle,
        location: location,
        location_type: 'ANY',
        years_of_experience: 'ALL'
      });

      console.log(`💰 JSearch API: Getting salary estimate for ${jobTitle} in ${location}`);

      const response = await fetch(`${this.BASE_URL}/estimated-salary?${params}`, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': this.API_KEY,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`JSearch salary estimate failed: ${response.status}`);
      }

      const data: JSearchResponse = await response.json();
      
      if (data.status === 'OK' && data.data) {
        console.log(`✅ JSearch API: Found salary data for ${jobTitle}`);
        return data.data as SalaryData[];
      }
      
      return [];
    } catch (error) {
      console.error('❌ JSearch salary estimate error:', error);
      return [];
    }
  }

  // Helper method to format salary data for display
  public static formatSalaryData(salaryData: SalaryData[]): string {
    if (!salaryData.length) return 'Salary data not available';
    
    const salary = salaryData[0];
    const currency = salary.salary_currency === 'USD' ? '$' : salary.salary_currency;
    const period = salary.salary_period === 'YEAR' ? '/year' : `/${salary.salary_period.toLowerCase()}`;
    
    return `${currency}${salary.min_salary.toLocaleString()} - ${currency}${salary.max_salary.toLocaleString()} ${period} (median: ${currency}${salary.median_salary.toLocaleString()})`;
  }
}