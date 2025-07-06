import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Key, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { MultiSourceJobService } from '@/services/MultiSourceJobService';

interface APIKeyManagerProps {
  onConfigChange?: () => void;
}

const APIKeyManager: React.FC<APIKeyManagerProps> = ({ onConfigChange }) => {
  const [apiKeys, setApiKeys] = useState({
    serpApiKey: '',
    diffbotToken: '',
    apifyToken: '',
  });
  
  const [showInputs, setShowInputs] = useState(false);

  // API service information
  const apiServices = [
    {
      key: 'serpApiKey' as const,
      name: 'SerpApi (Google Jobs)',
      description: 'Google Jobs aggregation - 100 free searches/month',
      website: 'https://serpapi.com',
      placeholder: 'Enter SerpApi key...',
      freeQuota: '100 searches/month',
    },
    {
      key: 'diffbotToken' as const,
      name: 'Diffbot (Career Pages)',
      description: 'Company career page extraction - 10K free extractions/month',
      website: 'https://app.diffbot.com',
      placeholder: 'Enter Diffbot token...',
      freeQuota: '10K extractions/month',
    },
    {
      key: 'apifyToken' as const,
      name: 'Apify (LinkedIn & Job Boards)',
      description: 'LinkedIn and job board scraping - $5 free credits/month',
      website: 'https://apify.com',
      placeholder: 'Enter Apify token...',
      freeQuota: '$5 credits/month',
    },
  ];

  // Load saved API keys on mount
  useEffect(() => {
    const savedConfig = MultiSourceJobService.loadAPIKeys();
    setApiKeys({
      serpApiKey: savedConfig.serpApiKey || '',
      diffbotToken: savedConfig.diffbotToken || '',
      apifyToken: savedConfig.apifyToken || '',
    });
    
    // Show inputs if no keys are configured
    const hasAnyKey = Object.values(savedConfig).some(key => key && key.trim());
    setShowInputs(!hasAnyKey);
  }, []);

  // Handle input changes
  const handleInputChange = (key: keyof typeof apiKeys, value: string) => {
    setApiKeys(prev => ({ ...prev, [key]: value }));
  };

  // Save API keys
  const saveAPIKeys = () => {
    // Filter out empty keys
    const filteredKeys = Object.entries(apiKeys).reduce((acc, [key, value]) => {
      if (value && value.trim()) {
        acc[key as keyof typeof apiKeys] = value.trim();
      }
      return acc;
    }, {} as typeof apiKeys);

    MultiSourceJobService.setAPIKeys(filteredKeys);
    
    const keyCount = Object.keys(filteredKeys).length;
    toast({
      title: "API Keys Saved",
      description: `Configured ${keyCount} API service${keyCount !== 1 ? 's' : ''}. Keys are stored securely in your browser.`,
    });

    onConfigChange?.();
    setShowInputs(false);
  };

  // Get current API status
  const apiStatus = MultiSourceJobService.getAPIStatus();
  const configuredCount = Object.values(apiStatus).filter(Boolean).length;

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Multi-Source Job Search APIs
          <Badge variant="secondary">{configuredCount}/3 Configured</Badge>
        </CardTitle>
        <CardDescription>
          Configure multiple job search APIs for comprehensive coverage. Each service has generous free tiers.
        </CardDescription>
      </CardHeader>
      <CardContent>

        {/* Toggle configuration */}
        {!showInputs && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowInputs(true)}
              className="flex items-center gap-2"
            >
              <Key className="h-3 w-3" />
              {configuredCount > 0 ? 'Update API Keys' : 'Configure API Keys'}
            </Button>
            {configuredCount > 0 && (
              <div className="text-sm text-muted-foreground flex items-center">
                {configuredCount} service{configuredCount !== 1 ? 's' : ''} configured
              </div>
            )}
          </div>
        )}

        {/* API Key Configuration */}
        {showInputs && (
          <div className="space-y-4">
            {apiServices.map((service) => (
              <div key={service.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={service.key} className="font-medium">
                    {service.name}
                  </Label>
                  <a
                    href={service.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    Get API Key <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <Input
                  id={service.key}
                  type="password"
                  value={apiKeys[service.key]}
                  onChange={(e) => handleInputChange(service.key, e.target.value)}
                  placeholder={service.placeholder}
                />
                <div className="text-xs text-muted-foreground">
                  {service.description} • Free tier: {service.freeQuota}
                </div>
              </div>
            ))}

            <div className="flex gap-2 pt-2">
              <Button onClick={saveAPIKeys}>
                Save Configuration
              </Button>
              <Button variant="outline" onClick={() => setShowInputs(false)}>
                Cancel
              </Button>
            </div>

            <div className="text-xs text-muted-foreground bg-white/50 p-3 rounded border">
              <strong>💡 Pro Tip:</strong> You don&apos;t need all APIs to get started. Even with just one API configured, 
              you&apos;ll get much better results than basic ATS scraping. Start with SerpApi for Google Jobs 
              (100 free searches) or Diffbot for career pages (10K free extractions).
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default APIKeyManager;