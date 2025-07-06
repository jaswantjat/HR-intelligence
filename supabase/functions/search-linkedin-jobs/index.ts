
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
    const apifyToken = Deno.env.get('APIFY_TOKEN');

    console.log('=== LinkedIn Jobs Search Debug ===');
    console.log('Company name:', companyName);
    console.log('Apify token configured:', !!apifyToken);
    console.log('Apify token length:', apifyToken?.length || 0);

    if (!apifyToken) {
      console.error('Apify token not found in environment variables');
      return new Response(JSON.stringify({ 
        error: 'Apify token not configured',
        jobs: [], 
        source: 'LinkedIn Jobs (Apify)',
        debug: 'API token missing'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use working LinkedIn job scrapers
    const linkedinActors = [
      'misceres/linkedin-jobs-search',
      'trudax/linkedin-job-scraper', 
      'voyager/linkedin-jobs-scraper'
    ];

    const jobs: any[] = [];
    let actorUsed = '';
    const actorResults: any[] = [];

    // Try each actor until one works
    for (const actorId of linkedinActors) {
      try {
        console.log(`Trying actor: ${actorId}`);
        const runInput = {
          queries: [`${companyName} jobs`],
          maxResults: 10,
          country: 'US',
        };

        console.log('Run input:', runInput);

        // Start the actor run
        const runUrl = `https://api.apify.com/v2/acts/${actorId}/runs?token=${apifyToken}`;
        console.log('Making run request to:', runUrl.replace(apifyToken, '[REDACTED]'));
        
        const runResponse = await fetch(runUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(runInput),
        });

        console.log(`Actor ${actorId} run response:`, runResponse.status);
        
        if (!runResponse.ok) {
          const errorText = await runResponse.text();
          console.log(`Actor ${actorId} failed with status ${runResponse.status}: ${errorText}`);
          actorResults.push({ actorId, status: runResponse.status, error: errorText });
          continue; // Try next actor
        }
        
        const runData = await runResponse.json();
        console.log(`Actor ${actorId} run data:`, { 
          id: runData.data?.id,
          status: runData.data?.status,
          datasetId: runData.data?.defaultDatasetId
        });
        
        const runId = runData.data.id;
        actorUsed = actorId;

        // Wait for completion with shorter timeout
        console.log('Waiting 5 seconds for actor to complete...');
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second wait

        // Get results
        const datasetId = runData.data.defaultDatasetId;
        const resultsUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}`;
        console.log('Fetching results from:', resultsUrl.replace(apifyToken, '[REDACTED]'));
        
        const resultsResponse = await fetch(resultsUrl);
        console.log(`Results fetch for ${actorId}:`, resultsResponse.status);
        
        if (!resultsResponse.ok) {
          const errorText = await resultsResponse.text();
          console.log(`Results fetch failed for ${actorId}: ${resultsResponse.status} - ${errorText}`);
          actorResults.push({ actorId, resultsStatus: resultsResponse.status, resultsError: errorText });
          continue;
        }
        
        const results = await resultsResponse.json();
        console.log(`Results for ${actorId}:`, { 
          totalItems: results.length,
          firstItemKeys: results[0] ? Object.keys(results[0]) : []
        });

        results.slice(0, 10).forEach((job: any, index: number) => {
          if (job.title) {
            console.log(`Job ${index + 1} from ${actorId}:`, {
              title: job.title,
              company: job.company,
              location: job.location
            });
            
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

        actorResults.push({ actorId, success: true, jobsFound: jobs.length });

        if (jobs.length > 0) {
          console.log(`Successfully found ${jobs.length} LinkedIn jobs using ${actorUsed}`);
          break; // Success, exit loop
        } else {
          console.log(`Actor ${actorId} completed but found no jobs`);
        }
      } catch (error) {
        console.log(`Actor ${actorId} failed with exception:`, error.message);
        actorResults.push({ actorId, exception: error.message });
        continue; // Try next actor
      }
    }

    console.log(`Final result: ${jobs.length} LinkedIn jobs for ${companyName}`);
    console.log('Actor results summary:', actorResults);

    return new Response(JSON.stringify({ 
      jobs, 
      source: 'LinkedIn Jobs (Apify)',
      debug: {
        totalFound: jobs.length,
        actorUsed,
        actorResults,
        hasToken: !!apifyToken
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('LinkedIn search failed with error:', error);
    console.error('Error stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      jobs: [], 
      source: 'LinkedIn Jobs (Apify)',
      error: error.message,
      debug: 'Exception thrown during search'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
