
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
    const diffbotToken = Deno.env.get('DIFFBOT_TOKEN');

    console.log('=== Career Pages Search Debug ===');
    console.log('Company name:', companyName);
    console.log('Diffbot token configured:', !!diffbotToken);
    console.log('Diffbot token length:', diffbotToken?.length || 0);

    if (!diffbotToken) {
      console.error('Diffbot token not found in environment variables');
      return new Response(JSON.stringify({ 
        error: 'Diffbot token not configured',
        jobs: [], 
        source: 'Company Careers (Diffbot)',
        debug: 'API token missing'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enhanced career page patterns for smaller companies
    const companyDomain = companyName.toLowerCase().replace(/\s+/g, '');
    const careerUrls = [
      `https://careers.${companyDomain}.com`,
      `https://jobs.${companyDomain}.com`,
      `https://${companyDomain}.com/careers`,
      `https://${companyDomain}.com/jobs`,
      `https://${companyDomain}.com/work-with-us`,
      `https://${companyDomain}.com/join-us`,
      `https://www.${companyDomain}.com/careers`,
      `https://www.${companyDomain}.com/jobs`,
      `https://${companyDomain}.io/careers`,
      `https://${companyDomain}.co/careers`,
    ];

    console.log('Will try these career URLs:', careerUrls);
    const jobs: any[] = [];
    const urlResults: any[] = [];

    // Try each URL with Diffbot
    for (const url of careerUrls.slice(0, 4)) { // Try more URLs for better coverage
      try {
        console.log(`Trying URL: ${url}`);
        const diffbotUrl = `https://api.diffbot.com/v3/analyze?token=${diffbotToken}&url=${encodeURIComponent(url)}&fields=objects.title,objects.location,objects.summary,objects.skills`;
        
        console.log('Making Diffbot request to:', diffbotUrl.replace(diffbotToken, '[REDACTED]'));
        const response = await fetch(diffbotUrl);
        console.log(`Diffbot response for ${url}:`, response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`Diffbot failed for ${url}: ${response.status} - ${errorText}`);
          urlResults.push({ url, status: response.status, error: errorText });
          continue;
        }
        
        const data = await response.json();
        console.log(`Diffbot data keys for ${url}:`, Object.keys(data));
        console.log(`Objects found for ${url}:`, data.objects?.length || 0);
        
        urlResults.push({ url, status: response.status, objectsFound: data.objects?.length || 0 });
        
        if (data.objects && data.objects.length > 0) {
          console.log(`Processing ${data.objects.length} objects from ${url}`);
          data.objects.slice(0, 5).forEach((job: any, index: number) => {
            if (job.title) {
              console.log(`Job ${index + 1} from ${url}:`, {
                title: job.title,
                location: job.location
              });
              
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
        
        if (jobs.length > 0) {
          console.log(`Found jobs on ${url}, stopping search`);
          break; // Found jobs, no need to try more URLs
        }
      } catch (error) {
        console.warn(`Diffbot exception for ${url}:`, error.message);
        urlResults.push({ url, error: error.message });
      }
    }

    console.log(`Final result: ${jobs.length} career page jobs for ${companyName}`);
    console.log('URL results summary:', urlResults);

    return new Response(JSON.stringify({ 
      jobs, 
      source: 'Company Careers (Diffbot)',
      debug: {
        totalFound: jobs.length,
        urlsTried: urlResults,
        hasToken: !!diffbotToken
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Diffbot career search failed with error:', error);
    console.error('Error stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      jobs: [], 
      source: 'Company Careers (Diffbot)',
      error: error.message,
      debug: 'Exception thrown during search'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
