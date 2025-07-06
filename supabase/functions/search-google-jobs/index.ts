
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyName } = await req.json();
    const serpApiKey = Deno.env.get('SERPAPI_KEY');

    console.log('=== Google Jobs Search Debug ===');
    console.log('Company name:', companyName);
    console.log('SerpApi key configured:', !!serpApiKey);
    console.log('SerpApi key length:', serpApiKey?.length || 0);

    if (!serpApiKey) {
      console.error('SerpApi key not found in environment variables');
      return new Response(JSON.stringify({ 
        error: 'SerpApi key not configured',
        jobs: [], 
        source: 'Google Jobs (SerpApi)',
        debug: 'API key missing'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const query = `${companyName} jobs`;
    const url = `https://serpapi.com/search.json?engine=google_jobs&q=${encodeURIComponent(query)}&api_key=${serpApiKey}`;
    
    console.log('Making request to SerpApi with query:', query);
    console.log('Request URL (without API key):', url.replace(serpApiKey, '[REDACTED]'));
    
    const response = await fetch(url);
    console.log('SerpApi response status:', response.status);
    console.log('SerpApi response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('SerpApi error response:', errorText);
      throw new Error(`SerpApi failed: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('SerpApi response data keys:', Object.keys(data));
    console.log('Jobs results found:', data.jobs_results?.length || 0);
    
    if (data.error) {
      console.error('SerpApi returned error:', data.error);
      return new Response(JSON.stringify({ 
        error: data.error,
        jobs: [], 
        source: 'Google Jobs (SerpApi)',
        debug: 'API returned error'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const jobs: any[] = [];

    if (data.jobs_results && data.jobs_results.length > 0) {
      console.log('Processing', data.jobs_results.length, 'job results');
      data.jobs_results.slice(0, 10).forEach((job: any, index: number) => {
        console.log(`Job ${index + 1}:`, {
          title: job.title,
          company: job.company_name,
          location: job.location
        });
        
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
    } else {
      console.log('No jobs_results found in response');
      console.log('Available data keys:', Object.keys(data));
    }

    console.log(`Final result: ${jobs.length} Google jobs for ${companyName}`);

    return new Response(JSON.stringify({ 
      jobs, 
      source: 'Google Jobs (SerpApi)',
      debug: {
        totalFound: jobs.length,
        queryUsed: query,
        hasApiKey: !!serpApiKey
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Google Jobs search failed with error:', error);
    console.error('Error stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      jobs: [], 
      source: 'Google Jobs (SerpApi)',
      error: error.message,
      debug: 'Exception thrown during search'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
