
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import CompanyAutocomplete from '@/components/CompanyAutocomplete';
import { toast } from '@/hooks/use-toast';
import { Search, ExternalLink, Loader2 } from 'lucide-react';
import { MultiSourceJobService } from '@/services/MultiSourceJobService';

interface JobResult {
  title: string;
  count: string;
  location: string;
  sourceUrl: string;
  salary?: string;
  datePosted?: string;
  jobType?: string;
}

interface SearchAnalytics {
  totalSearches: number;
  totalJobsFound: number;
  topCompanies: { [key: string]: number };
  jobTypes: { [key: string]: number };
  locations: { [key: string]: number };
  averageJobsPerSearch: number;
}

// Validation function for job results
const validateJobResult = (obj: any): obj is JobResult => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.title === 'string' &&
    typeof obj.count === 'string' &&
    typeof obj.location === 'string' &&
    typeof obj.sourceUrl === 'string'
  );
};

const JobSearch = () => {
  const [companyName, setCompanyName] = useState('');
  const [results, setResults] = useState<JobResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sources, setSources] = useState<string[]>([]);
  const [analytics, setAnalytics] = useState<SearchAnalytics>({
    totalSearches: 0,
    totalJobsFound: 0,
    topCompanies: {},
    jobTypes: {},
    locations: {},
    averageJobsPerSearch: 0
  });
  
  // Analytics tracking
  const updateAnalytics = useCallback((companyName: string, jobResults: JobResult[]) => {
    setAnalytics(prev => {
      const newTopCompanies = { ...prev.topCompanies };
      newTopCompanies[companyName] = (newTopCompanies[companyName] || 0) + 1;
      
      const newJobTypes = { ...prev.jobTypes };
      const newLocations = { ...prev.locations };
      
      jobResults.forEach(job => {
        if (job.jobType) {
          newJobTypes[job.jobType] = (newJobTypes[job.jobType] || 0) + 1;
        }
        if (job.location) {
          newLocations[job.location] = (newLocations[job.location] || 0) + 1;
        }
      });
      
      const newTotalSearches = prev.totalSearches + 1;
      const newTotalJobsFound = prev.totalJobsFound + jobResults.length;
      
      return {
        totalSearches: newTotalSearches,
        totalJobsFound: newTotalJobsFound,
        topCompanies: newTopCompanies,
        jobTypes: newJobTypes,
        locations: newLocations,
        averageJobsPerSearch: newTotalJobsFound / newTotalSearches
      };
    });
  }, []);

  // Simple search function without caching
  const searchJobs = useCallback(async () => {
    if (!companyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a company name",
        variant: "destructive",
      });
      return;
    }

    // Enhanced company name processing
    let processedCompanyName = companyName.trim();
    
    // Remove common suffixes and clean up
    processedCompanyName = processedCompanyName
      .replace(/\.(com|org|net|io|co|inc|corp|ltd|llc)$/i, '')
      .replace(/\s+(inc|corp|ltd|llc|company|co)\.?$/i, '')
      .replace(/[^\w\s&.-]/g, '')
      .trim();
    
    console.log('Original company name:', companyName);
    console.log('Processed company name for search:', processedCompanyName);

    setLoading(true);
    setError('');
    setResults([]);
    setSources([]);

    try {
      console.log('Fetching jobs from multi-source APIs for company:', processedCompanyName);
      
      const searchResponse = await MultiSourceJobService.searchAllSources(processedCompanyName);
      
      if (searchResponse.success && searchResponse.jobs.length > 0) {
        setResults(searchResponse.jobs);
        setSources(searchResponse.sources);
        setError('');
        
        // Track analytics
        updateAnalytics(processedCompanyName, searchResponse.jobs);
        
        toast({
          title: "Search Complete",
          description: `Found ${searchResponse.jobs.length} job opening${searchResponse.jobs.length !== 1 ? 's' : ''} from ${searchResponse.sources.join(', ')}`,
        });
      } else {
        const errorMessage = `No active job openings found for "${companyName}".

🔍 This could happen because:
• The company currently has no openings on major job platforms
• Small companies often post jobs only on their career pages
• Jobs might be posted on niche industry-specific boards
• The company might not be actively hiring right now

💡 Try these suggestions:
• Search for "${processedCompanyName}" (cleaned version)
• Check the company's career page directly
• Try variations of the company name
• Look for similar companies in the same industry

Popular alternatives: Google, Microsoft, Stripe, Notion, Figma, Linear, Vercel, Supabase`;

        setError(errorMessage);
      }

    } catch (err) {
      console.error('Search error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Search failed: ${errorMessage}

This might be a temporary issue. Please try again in a moment.`);
      
      toast({
        title: "Search Failed",
        description: "Could not fetch job data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [companyName, updateAnalytics]);

  // Simple input handler
  const handleCompanyNameChange = useCallback((value: string) => {
    setCompanyName(value);
  }, []);

  // Simple keyboard handler
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading && companyName.trim()) {
      searchJobs();
    }
  }, [searchJobs, loading, companyName]);

  // Handler for search button click
  const handleSearchClick = useCallback(() => {
    searchJobs();
  }, [searchJobs]);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Multi-Source Job Search</h1>
          <p className="text-muted-foreground">
            Search across Google Jobs, LinkedIn, company career pages, and major job boards
          </p>
        </div>

        {/* Search Interface */}
        <Card>
          <CardHeader>
            <CardTitle>Company Job Search</CardTitle>
            <CardDescription>
              Enter a company name to search across multiple platforms.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <CompanyAutocomplete
                value={companyName}
                onChange={handleCompanyNameChange}
                onSelect={(company) => {
                  console.log('Selected company:', company);
                  // Automatically trigger search after selection
                  setTimeout(() => searchJobs(), 100);
                }}
                placeholder="e.g., Google, Microsoft, Apple..."
                disabled={loading}
                className="flex-1"
              />
              <Button 
                onClick={handleSearchClick} 
                disabled={loading || !companyName.trim()}
                size="icon"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              💡 Works for companies of all sizes • Press Enter to search
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive text-center whitespace-pre-line">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Results Display */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                {results.length} Opening{results.length !== 1 ? 's' : ''} at {companyName}
              </CardTitle>
              {sources.length > 0 && (
                <CardDescription>
                  Sources: {sources.join(', ')}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                 {results.map((job, index) => (
                   <div key={index} className="border rounded-lg p-4 hover:bg-accent transition-colors">
                     <div className="flex items-start justify-between">
                       <div className="space-y-1 flex-1">
                         <h3 className="font-semibold">{job.title}</h3>
                         <div className="space-y-1 text-sm text-muted-foreground">
                            <p>{job.count} position{job.count !== '1' ? 's' : ''} • {job.location}</p>
                            {job.salary && <p className="text-green-600 font-medium">💰 {job.salary}</p>}
                            <div className="flex gap-3">
                              {job.jobType && <span className="bg-primary/10 px-2 py-1 rounded text-xs">{job.jobType}</span>}
                              {job.datePosted && <span className="text-xs">📅 {job.datePosted}</span>}
                              {(job as any).atsSource && <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">{(job as any).atsSource}</span>}
                            </div>
                         </div>
                       </div>
                       <Button variant="outline" size="sm" asChild>
                         <a 
                           href={job.sourceUrl} 
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="flex items-center gap-1"
                         >
                           <ExternalLink className="h-3 w-3" />
                           Apply
                         </a>
                       </Button>
                     </div>
                   </div>
                 ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analytics Dashboard */}
        {analytics.totalSearches > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>📊 Search Analytics</CardTitle>
              <CardDescription>
                Real-time insights from your job searches
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{analytics.totalSearches}</div>
                  <div className="text-sm text-muted-foreground">Total Searches</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{analytics.totalJobsFound}</div>
                  <div className="text-sm text-muted-foreground">Jobs Found</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{analytics.averageJobsPerSearch.toFixed(1)}</div>
                  <div className="text-sm text-muted-foreground">Avg per Search</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{Object.keys(analytics.topCompanies).length}</div>
                  <div className="text-sm text-muted-foreground">Companies</div>
                </div>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4">
                {/* Top Companies */}
                {Object.keys(analytics.topCompanies).length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">🏢 Top Searched Companies</h4>
                    <div className="space-y-1">
                      {Object.entries(analytics.topCompanies)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 5)
                        .map(([company, count]) => (
                          <div key={company} className="flex justify-between text-sm">
                            <span>{company}</span>
                            <span className="text-muted-foreground">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                
                {/* Job Types */}
                {Object.keys(analytics.jobTypes).length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">💼 Job Types</h4>
                    <div className="space-y-1">
                      {Object.entries(analytics.jobTypes)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 5)
                        .map(([type, count]) => (
                          <div key={type} className="flex justify-between text-sm">
                            <span>{type}</span>
                            <span className="text-muted-foreground">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                
                {/* Top Locations */}
                {Object.keys(analytics.locations).length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">📍 Top Locations</h4>
                    <div className="space-y-1">
                      {Object.entries(analytics.locations)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 5)
                        .map(([location, count]) => (
                          <div key={location} className="flex justify-between text-sm">
                            <span className="truncate">{location}</span>
                            <span className="text-muted-foreground">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default JobSearch;
