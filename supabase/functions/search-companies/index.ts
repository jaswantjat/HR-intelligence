
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompanySuggestion {
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  location?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    
    console.log('🔍 Company search request:', query);

    // Comprehensive company database
    const allCompanies: CompanySuggestion[] = [
      // FAANG + Big Tech
      { name: 'Google', domain: 'google.com', industry: 'Technology', size: 'Large' },
      { name: 'Microsoft', domain: 'microsoft.com', industry: 'Technology', size: 'Large' },
      { name: 'Apple', domain: 'apple.com', industry: 'Technology', size: 'Large' },
      { name: 'Amazon', domain: 'amazon.com', industry: 'E-commerce', size: 'Large' },
      { name: 'Meta', domain: 'meta.com', industry: 'Social Media', size: 'Large' },
      { name: 'Netflix', domain: 'netflix.com', industry: 'Entertainment', size: 'Large' },
      { name: 'Tesla', domain: 'tesla.com', industry: 'Automotive', size: 'Large' },
      { name: 'Nvidia', domain: 'nvidia.com', industry: 'Technology', size: 'Large' },
      { name: 'Intel', domain: 'intel.com', industry: 'Technology', size: 'Large' },
      { name: 'IBM', domain: 'ibm.com', industry: 'Technology', size: 'Large' },
      { name: 'Oracle', domain: 'oracle.com', industry: 'Technology', size: 'Large' },
      { name: 'Salesforce', domain: 'salesforce.com', industry: 'Software', size: 'Large' },
      { name: 'Adobe', domain: 'adobe.com', industry: 'Software', size: 'Large' },
      
      // Fintech & Finance
      { name: 'Stripe', domain: 'stripe.com', industry: 'Fintech', size: 'Large' },
      { name: 'Square', domain: 'squareup.com', industry: 'Fintech', size: 'Large' },
      { name: 'PayPal', domain: 'paypal.com', industry: 'Fintech', size: 'Large' },
      { name: 'Coinbase', domain: 'coinbase.com', industry: 'Fintech', size: 'Medium' },
      { name: 'Robinhood', domain: 'robinhood.com', industry: 'Fintech', size: 'Medium' },
      { name: 'Plaid', domain: 'plaid.com', industry: 'Fintech', size: 'Medium' },
      { name: 'Chime', domain: 'chime.com', industry: 'Fintech', size: 'Medium' },
      { name: 'Affirm', domain: 'affirm.com', industry: 'Fintech', size: 'Medium' },
      { name: 'Klarna', domain: 'klarna.com', industry: 'Fintech', size: 'Medium' },
      
      // AI & ML Companies
      { name: 'OpenAI', domain: 'openai.com', industry: 'AI', size: 'Medium' },
      { name: 'Anthropic', domain: 'anthropic.com', industry: 'AI', size: 'Medium' },
      { name: 'Stability AI', domain: 'stability.ai', industry: 'AI', size: 'Small' },
      { name: 'Cohere', domain: 'cohere.com', industry: 'AI', size: 'Small' },
      { name: 'Hugging Face', domain: 'huggingface.co', industry: 'AI', size: 'Small' },
      { name: 'Scale AI', domain: 'scale.com', industry: 'AI', size: 'Medium' },
      { name: 'DataBricks', domain: 'databricks.com', industry: 'AI', size: 'Large' },
      { name: 'Weights & Biases', domain: 'wandb.ai', industry: 'AI', size: 'Small' },
      { name: 'Replicate', domain: 'replicate.com', industry: 'AI', size: 'Small' },
      
      // Startups & Unicorns
      { name: 'Notion', domain: 'notion.so', industry: 'Productivity', size: 'Medium' },
      { name: 'Figma', domain: 'figma.com', industry: 'Design', size: 'Medium' },
      { name: 'Linear', domain: 'linear.app', industry: 'Project Management', size: 'Small' },
      { name: 'Vercel', domain: 'vercel.com', industry: 'Developer Tools', size: 'Small' },
      { name: 'Supabase', domain: 'supabase.com', industry: 'Database', size: 'Small' },
      { name: 'Airtable', domain: 'airtable.com', industry: 'Database', size: 'Medium' },
      { name: 'Webflow', domain: 'webflow.com', industry: 'Design', size: 'Medium' },
      { name: 'Framer', domain: 'framer.com', industry: 'Design', size: 'Small' },
      { name: 'Canva', domain: 'canva.com', industry: 'Design', size: 'Large' },
      { name: 'Miro', domain: 'miro.com', industry: 'Collaboration', size: 'Medium' },
      { name: 'Loom', domain: 'loom.com', industry: 'Communication', size: 'Small' },
      { name: 'Calendly', domain: 'calendly.com', industry: 'Productivity', size: 'Small' },
      { name: 'Typeform', domain: 'typeform.com', industry: 'Productivity', size: 'Small' },
      
      // SaaS & Enterprise
      { name: 'Slack', domain: 'slack.com', industry: 'Communication', size: 'Large' },
      { name: 'Zoom', domain: 'zoom.us', industry: 'Communication', size: 'Large' },
      { name: 'Dropbox', domain: 'dropbox.com', industry: 'Storage', size: 'Large' },
      { name: 'Box', domain: 'box.com', industry: 'Storage', size: 'Large' },
      { name: 'Atlassian', domain: 'atlassian.com', industry: 'Software', size: 'Large' },
      { name: 'Jira', domain: 'atlassian.com', industry: 'Project Management', size: 'Large' },
      { name: 'Confluence', domain: 'atlassian.com', industry: 'Collaboration', size: 'Large' },
      { name: 'Asana', domain: 'asana.com', industry: 'Project Management', size: 'Medium' },
      { name: 'Monday.com', domain: 'monday.com', industry: 'Project Management', size: 'Medium' },
      { name: 'Trello', domain: 'trello.com', industry: 'Project Management', size: 'Medium' },
      
      // Cloud & Infrastructure
      { name: 'AWS', domain: 'aws.amazon.com', industry: 'Cloud', size: 'Large' },
      { name: 'Google Cloud', domain: 'cloud.google.com', industry: 'Cloud', size: 'Large' },
      { name: 'Azure', domain: 'azure.microsoft.com', industry: 'Cloud', size: 'Large' },
      { name: 'DigitalOcean', domain: 'digitalocean.com', industry: 'Cloud', size: 'Medium' },
      { name: 'Linode', domain: 'linode.com', industry: 'Cloud', size: 'Medium' },
      { name: 'Heroku', domain: 'heroku.com', industry: 'Cloud', size: 'Medium' },
      { name: 'Cloudflare', domain: 'cloudflare.com', industry: 'Cloud', size: 'Large' },
      { name: 'Fastly', domain: 'fastly.com', industry: 'Cloud', size: 'Medium' },
      { name: 'MongoDB', domain: 'mongodb.com', industry: 'Database', size: 'Large' },
      { name: 'Redis', domain: 'redis.com', industry: 'Database', size: 'Medium' },
      { name: 'Snowflake', domain: 'snowflake.com', industry: 'Database', size: 'Large' },
      
      // E-commerce & Retail
      { name: 'Shopify', domain: 'shopify.com', industry: 'E-commerce', size: 'Large' },
      { name: 'Etsy', domain: 'etsy.com', industry: 'E-commerce', size: 'Large' },
      { name: 'eBay', domain: 'ebay.com', industry: 'E-commerce', size: 'Large' },
      { name: 'Walmart', domain: 'walmart.com', industry: 'Retail', size: 'Large' },
      { name: 'Target', domain: 'target.com', industry: 'Retail', size: 'Large' },
      { name: 'Best Buy', domain: 'bestbuy.com', industry: 'Retail', size: 'Large' },
      
      // Social Media & Content
      { name: 'Twitter', domain: 'twitter.com', industry: 'Social Media', size: 'Large' },
      { name: 'LinkedIn', domain: 'linkedin.com', industry: 'Social Media', size: 'Large' },
      { name: 'Instagram', domain: 'instagram.com', industry: 'Social Media', size: 'Large' },
      { name: 'TikTok', domain: 'tiktok.com', industry: 'Social Media', size: 'Large' },
      { name: 'YouTube', domain: 'youtube.com', industry: 'Entertainment', size: 'Large' },
      { name: 'Twitch', domain: 'twitch.tv', industry: 'Entertainment', size: 'Large' },
      { name: 'Discord', domain: 'discord.com', industry: 'Communication', size: 'Large' },
      { name: 'Reddit', domain: 'reddit.com', industry: 'Social Media', size: 'Large' },
      { name: 'Pinterest', domain: 'pinterest.com', industry: 'Social Media', size: 'Large' },
      { name: 'Snapchat', domain: 'snapchat.com', industry: 'Social Media', size: 'Large' },
      
      // Gaming
      { name: 'Epic Games', domain: 'epicgames.com', industry: 'Gaming', size: 'Large' },
      { name: 'Valve', domain: 'valvesoftware.com', industry: 'Gaming', size: 'Medium' },
      { name: 'Riot Games', domain: 'riotgames.com', industry: 'Gaming', size: 'Large' },
      { name: 'Blizzard', domain: 'blizzard.com', industry: 'Gaming', size: 'Large' },
      { name: 'Electronic Arts', domain: 'ea.com', industry: 'Gaming', size: 'Large' },
      { name: 'Ubisoft', domain: 'ubisoft.com', industry: 'Gaming', size: 'Large' },
      { name: 'Unity', domain: 'unity.com', industry: 'Gaming', size: 'Large' },
      
      // Consulting & Services
      { name: 'McKinsey', domain: 'mckinsey.com', industry: 'Consulting', size: 'Large' },
      { name: 'BCG', domain: 'bcg.com', industry: 'Consulting', size: 'Large' },
      { name: 'Bain', domain: 'bain.com', industry: 'Consulting', size: 'Large' },
      { name: 'Deloitte', domain: 'deloitte.com', industry: 'Consulting', size: 'Large' },
      { name: 'PwC', domain: 'pwc.com', industry: 'Consulting', size: 'Large' },
      { name: 'EY', domain: 'ey.com', industry: 'Consulting', size: 'Large' },
      { name: 'KPMG', domain: 'kpmg.com', industry: 'Consulting', size: 'Large' },
      { name: 'Accenture', domain: 'accenture.com', industry: 'Consulting', size: 'Large' },
      
      // Transportation & Logistics
      { name: 'Uber', domain: 'uber.com', industry: 'Transportation', size: 'Large' },
      { name: 'Lyft', domain: 'lyft.com', industry: 'Transportation', size: 'Large' },
      { name: 'DoorDash', domain: 'doordash.com', industry: 'Food Delivery', size: 'Large' },
      { name: 'Instacart', domain: 'instacart.com', industry: 'Food Delivery', size: 'Large' },
      { name: 'Grubhub', domain: 'grubhub.com', industry: 'Food Delivery', size: 'Large' },
      { name: 'UberEats', domain: 'ubereats.com', industry: 'Food Delivery', size: 'Large' },
      { name: 'FedEx', domain: 'fedex.com', industry: 'Logistics', size: 'Large' },
      { name: 'UPS', domain: 'ups.com', industry: 'Logistics', size: 'Large' },
      
      // Healthcare & Biotech
      { name: 'Moderna', domain: 'modernatx.com', industry: 'Biotech', size: 'Large' },
      { name: 'Pfizer', domain: 'pfizer.com', industry: 'Pharmaceutical', size: 'Large' },
      { name: 'Johnson & Johnson', domain: 'jnj.com', industry: 'Healthcare', size: 'Large' },
      { name: 'Teladoc', domain: 'teladoc.com', industry: 'Healthcare', size: 'Large' },
      { name: '23andMe', domain: '23andme.com', industry: 'Biotech', size: 'Medium' },
      
      // Smaller Tech Companies & Startups
      { name: 'Intercom', domain: 'intercom.com', industry: 'Customer Support', size: 'Medium' },
      { name: 'Zendesk', domain: 'zendesk.com', industry: 'Customer Support', size: 'Large' },
      { name: 'Freshworks', domain: 'freshworks.com', industry: 'Customer Support', size: 'Medium' },
      { name: 'HubSpot', domain: 'hubspot.com', industry: 'Marketing', size: 'Large' },
      { name: 'Mailchimp', domain: 'mailchimp.com', industry: 'Marketing', size: 'Medium' },
      { name: 'SendGrid', domain: 'sendgrid.com', industry: 'Email', size: 'Medium' },
      { name: 'Twilio', domain: 'twilio.com', industry: 'Communication', size: 'Large' },
      { name: 'Auth0', domain: 'auth0.com', industry: 'Security', size: 'Medium' },
      { name: 'Okta', domain: 'okta.com', industry: 'Security', size: 'Large' },
      { name: 'CrowdStrike', domain: 'crowdstrike.com', industry: 'Security', size: 'Large' },
      { name: 'Splunk', domain: 'splunk.com', industry: 'Analytics', size: 'Large' },
      { name: 'Datadog', domain: 'datadoghq.com', industry: 'Monitoring', size: 'Large' },
      { name: 'New Relic', domain: 'newrelic.com', industry: 'Monitoring', size: 'Medium' },
      { name: 'PagerDuty', domain: 'pagerduty.com', industry: 'Monitoring', size: 'Medium' },
      { name: 'Segment', domain: 'segment.com', industry: 'Analytics', size: 'Medium' },
      { name: 'Mixpanel', domain: 'mixpanel.com', industry: 'Analytics', size: 'Medium' },
      { name: 'Amplitude', domain: 'amplitude.com', industry: 'Analytics', size: 'Medium' },
      { name: 'Looker', domain: 'looker.com', industry: 'Analytics', size: 'Medium' },
      { name: 'Tableau', domain: 'tableau.com', industry: 'Analytics', size: 'Large' },
      { name: 'Palantir', domain: 'palantir.com', industry: 'Analytics', size: 'Large' },
    ];

    if (!query || query.length < 1) {
      // Return popular companies when no query
      const popularCompanies = allCompanies
        .filter(company => company.size === 'Large' || ['Stripe', 'Notion', 'Figma', 'Linear', 'Vercel', 'Supabase', 'Anthropic', 'OpenAI'].includes(company.name))
        .slice(0, 12);
      
      console.log(`✅ Returning ${popularCompanies.length} popular companies`);
      return new Response(JSON.stringify({ suggestions: popularCompanies }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Smart search function with multiple matching strategies
    const queryLower = query.toLowerCase().trim();
    const suggestions: CompanySuggestion[] = [];
    const seenCompanies = new Set<string>();

    // 1. Exact matches (case insensitive)
    const exactMatches = allCompanies.filter(company => 
      company.name.toLowerCase() === queryLower
    );

    // 2. Starts with matches
    const startsWithMatches = allCompanies.filter(company => 
      company.name.toLowerCase().startsWith(queryLower) && 
      company.name.toLowerCase() !== queryLower
    );

    // 3. Contains matches
    const containsMatches = allCompanies.filter(company => 
      company.name.toLowerCase().includes(queryLower) && 
      !company.name.toLowerCase().startsWith(queryLower)
    );

    // 4. Fuzzy matches (for typos)
    const fuzzyMatches = allCompanies.filter(company => {
      const companyLower = company.name.toLowerCase();
      const distance = levenshteinDistance(queryLower, companyLower);
      const threshold = Math.max(1, Math.floor(queryLower.length / 3));
      return distance <= threshold && 
             distance > 0 && 
             !companyLower.includes(queryLower) &&
             !queryLower.includes(companyLower);
    });

    // 5. Domain matches (e.g., "google.com" -> "Google")
    const domainMatches = allCompanies.filter(company => {
      if (!company.domain) return false;
      const domainWithoutTld = company.domain.replace(/\.(com|org|net|io|co|ai)$/, '');
      return domainWithoutTld.toLowerCase().includes(queryLower) ||
             queryLower.includes(domainWithoutTld.toLowerCase());
    });

    // Combine results in priority order
    const allMatches = [
      ...exactMatches,
      ...startsWithMatches, 
      ...containsMatches,
      ...fuzzyMatches,
      ...domainMatches
    ];

    // Remove duplicates and limit results
    allMatches.forEach(company => {
      const key = company.name.toLowerCase();
      if (!seenCompanies.has(key) && suggestions.length < 8) {
        seenCompanies.add(key);
        suggestions.push(company);
      }
    });

    console.log(`✅ Found ${suggestions.length} company matches for "${query}"`);

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Company search failed:', error);
    return new Response(JSON.stringify({ 
      suggestions: [],
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Enhanced Levenshtein distance function with early termination
function levenshteinDistance(str1: string, str2: string): number {
  if (Math.abs(str1.length - str2.length) > 3) return 999; // Early exit for very different lengths
  
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}
