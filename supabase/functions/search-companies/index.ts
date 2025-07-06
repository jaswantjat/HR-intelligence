
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
    const serpApiKey = Deno.env.get('SERPAPI_KEY');

    if (!serpApiKey) {
      return new Response(JSON.stringify({ error: 'SerpApi key not configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!query || query.length < 1) {
      // Enhanced popular companies including startups and smaller companies
      const popularCompanies: CompanySuggestion[] = [
        { name: 'Google', domain: 'google.com', industry: 'Technology' },
        { name: 'Microsoft', domain: 'microsoft.com', industry: 'Technology' },
        { name: 'Apple', domain: 'apple.com', industry: 'Technology' },
        { name: 'Amazon', domain: 'amazon.com', industry: 'E-commerce' },
        { name: 'Meta', domain: 'meta.com', industry: 'Social Media' },
        { name: 'Stripe', domain: 'stripe.com', industry: 'Fintech' },
        { name: 'Notion', domain: 'notion.so', industry: 'Productivity' },
        { name: 'Figma', domain: 'figma.com', industry: 'Design' },
        { name: 'Linear', domain: 'linear.app', industry: 'Project Management' },
        { name: 'Vercel', domain: 'vercel.com', industry: 'Developer Tools' },
        { name: 'Supabase', domain: 'supabase.com', industry: 'Database' },
        { name: 'Anthropic', domain: 'anthropic.com', industry: 'AI' },
      ];
      return new Response(JSON.stringify({ suggestions: popularCompanies }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Searching for companies matching:', query);

    // Enhanced search query for better startup/small company results
    const searchQueries = [
      `${query} company site:linkedin.com OR site:crunchbase.com`,
      `${query} startup site:linkedin.com OR site:crunchbase.com`,
      `"${query}" company careers jobs`,
    ];

    const suggestions: CompanySuggestion[] = [];
    const seenCompanies = new Set<string>();

    // Try multiple search approaches
    for (const searchQuery of searchQueries) {
      if (suggestions.length >= 8) break;

      try {
        const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(searchQuery)}&api_key=${serpApiKey}&num=15`;
        
        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`SerpApi search failed for "${searchQuery}": ${response.status}`);
          continue;
        }
        
        const data = await response.json();

        // Extract company information from search results
        if (data.organic_results) {
          data.organic_results.forEach((result: any) => {
            if (suggestions.length >= 8) return;

            let companyName = '';
            let domain = '';
            let industry = '';
            let size = '';

            // Enhanced extraction from LinkedIn company pages
            if (result.link?.includes('linkedin.com/company/')) {
              // Extract company name from title
              const titleMatch = result.title?.match(/^([^|•-]+)/);
              if (titleMatch) {
                companyName = titleMatch[1].trim();
                
                // Extract follower count as size indicator
                const followerMatch = result.snippet?.match(/([\d,]+\.?\d*[KMB]?\+?\s*followers)/i);
                if (followerMatch) {
                  size = followerMatch[1];
                }
                
                // Extract industry from snippet
                const industryMatch = result.snippet?.match(/(?:Industry|Sector)[:\s]+([^•|\.;]+)/i);
                if (industryMatch) {
                  industry = industryMatch[1].trim();
                } else {
                  // Fallback industry extraction
                  const commonIndustries = ['software', 'technology', 'fintech', 'healthcare', 'e-commerce', 'retail', 'finance', 'startup', 'saas', 'ai', 'blockchain', 'cybersecurity'];
                  const lowerSnippet = result.snippet?.toLowerCase() || '';
                  for (const ind of commonIndustries) {
                    if (lowerSnippet.includes(ind)) {
                      industry = ind.charAt(0).toUpperCase() + ind.slice(1);
                      break;
                    }
                  }
                }

                // Extract domain from company URL or guess
                const urlMatch = result.snippet?.match(/https?:\/\/(www\.)?([^\/\s]+)/);
                if (urlMatch) {
                  domain = urlMatch[2];
                } else {
                  // Generate likely domain
                  const cleanName = companyName.toLowerCase()
                    .replace(/[^a-z0-9\s]/g, '')
                    .replace(/\s+/g, '');
                  domain = `${cleanName}.com`;
                }
              }
            }
            
            // Enhanced extraction from Crunchbase
            else if (result.link?.includes('crunchbase.com/organization/')) {
              const titleMatch = result.title?.match(/^([^-|•]+)/);
              if (titleMatch) {
                companyName = titleMatch[1].trim().replace(' - Crunchbase', '');
                
                // Extract funding stage/size info
                const fundingMatch = result.snippet?.match(/(seed|series [a-z]|pre-seed|angel|venture|startup)/i);
                if (fundingMatch) {
                  size = fundingMatch[1];
                }
                
                // Extract industry
                const industryPatterns = [
                  /operates in the ([^\.]+) industry/i,
                  /is a ([^\.]+) company/i,
                  /(software|technology|fintech|healthcare|e-commerce|retail|finance|saas|ai|blockchain)/i
                ];
                
                for (const pattern of industryPatterns) {
                  const match = result.snippet?.match(pattern);
                  if (match) {
                    industry = match[1].trim();
                    break;
                  }
                }

                // Extract or guess domain
                const domainMatch = result.snippet?.match(/(?:website|visit|at)\s+(?:https?:\/\/)?(www\.)?([^\/\s]+)/i);
                if (domainMatch) {
                  domain = domainMatch[2];
                } else {
                  const cleanName = companyName.toLowerCase()
                    .replace(/[^a-z0-9\s]/g, '')
                    .replace(/\s+/g, '');
                  domain = `${cleanName}.com`;
                }
              }
            }

            // General company extraction from other results
            else if (result.title && result.snippet) {
              const titleWords = result.title.split(/[\s\-|•]/);
              if (titleWords.length > 0) {
                companyName = titleWords[0].trim();
                
                // Check if this looks like a company
                const companyIndicators = ['inc', 'corp', 'llc', 'ltd', 'company', 'technologies', 'solutions', 'systems', 'labs', 'group'];
                const hasCompanyIndicator = companyIndicators.some(indicator => 
                  result.title.toLowerCase().includes(indicator) || 
                  result.snippet?.toLowerCase().includes(indicator)
                );
                
                if (hasCompanyIndicator || result.snippet?.toLowerCase().includes('careers') || result.snippet?.toLowerCase().includes('jobs')) {
                  // Extract domain from display link
                  if (result.displayed_link) {
                    domain = result.displayed_link.split('/')[0];
                  }
                  
                  // Guess industry
                  const techKeywords = ['software', 'app', 'platform', 'digital', 'cloud', 'data', 'ai', 'tech'];
                  if (techKeywords.some(keyword => result.snippet?.toLowerCase().includes(keyword))) {
                    industry = 'Technology';
                  }
                }
              }
            }

            // Clean up and validate company name
            if (companyName && companyName.length > 1) {
              companyName = companyName
                .replace(/\s*-\s*(Crunchbase|LinkedIn|Careers|Jobs).*$/i, '')
                .replace(/\s*(Inc|LLC|Ltd|Corp|Corporation|Company)\.?$/i, '')
                .replace(/[^\w\s&.-]/g, '')
                .trim();

              // More permissive validation for small companies
              const normalizedName = companyName.toLowerCase();
              if (normalizedName.length >= 2 && 
                  !seenCompanies.has(normalizedName) &&
                  !normalizedName.match(/^(the|and|or|for|with|from|about)$/)) {
                
                seenCompanies.add(normalizedName);
                suggestions.push({
                  name: companyName,
                  domain: domain || undefined,
                  industry: industry || undefined,
                  size: size || undefined,
                });
              }
            }
          });
        }
      } catch (error) {
        console.warn(`Search query "${searchQuery}" failed:`, error);
      }
    }

    // Enhanced fallback with startup-focused suggestions
    if (suggestions.length < 3) {
      const startupCompanies = [
        'Anthropic', 'OpenAI', 'Notion', 'Figma', 'Linear', 'Vercel', 'Supabase',
        'Replicate', 'Hugging Face', 'Stability AI', 'Cohere', 'Pinecone',
        'LangChain', 'Weights & Biases', 'Wandb', 'Modal', 'RunPod',
        'Scale AI', 'DataBricks', 'Snowflake', 'MongoDB', 'Airtable',
        'Webflow', 'Framer', 'Canva', 'Miro', 'Loom', 'Calendly',
        'Typeform', 'Intercom', 'Zendesk', 'Freshworks', 'HubSpot'
      ];

      const queryLower = query.toLowerCase();
      const fuzzyMatches = startupCompanies
        .filter(company => {
          const companyLower = company.toLowerCase();
          return companyLower.includes(queryLower) || 
                 queryLower.includes(companyLower) ||
                 levenshteinDistance(queryLower, companyLower) <= Math.max(2, Math.floor(queryLower.length / 3));
        })
        .slice(0, 8 - suggestions.length);

      fuzzyMatches.forEach(company => {
        const normalizedName = company.toLowerCase();
        if (!seenCompanies.has(normalizedName)) {
          seenCompanies.add(normalizedName);
          suggestions.push({
            name: company,
            domain: `${company.toLowerCase().replace(/\s+/g, '')}.com`,
            industry: 'Technology'
          });
        }
      });
    }

    console.log(`Found ${suggestions.length} company suggestions for "${query}"`);

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
