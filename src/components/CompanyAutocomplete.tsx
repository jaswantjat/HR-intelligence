import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CompanySuggestion {
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  location?: string;
}

interface CompanyAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (company: CompanySuggestion) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const CompanyAutocomplete: React.FC<CompanyAutocompleteProps> = ({
  value,
  onChange,
  onSelect,
  placeholder = "e.g., Google, Microsoft, Apple...",
  disabled = false,
  className = "",
}) => {
  const [suggestions, setSuggestions] = useState<CompanySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Fetch company suggestions
  const fetchSuggestions = useCallback(async (query: string) => {
    try {
      setLoading(true);
      console.log('🔍 Fetching company suggestions for:', query);
      
      const { data, error } = await supabase.functions.invoke('search-companies', {
        body: { query: query.trim() }
      });

      if (error) {
        console.error('❌ Company search error:', error);
        return;
      }

      console.log('✅ Company suggestions response:', data);
      
      const companies = data?.suggestions || [];
      setSuggestions(companies);
      setShowSuggestions(companies.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('🚨 Company autocomplete failed:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle input change with debouncing
  const handleInputChange = useCallback((newValue: string) => {
    onChange(newValue);
    
    if (newValue.trim().length > 0) {
      // Debounce the API call
      const timeoutId = setTimeout(() => {
        fetchSuggestions(newValue);
      }, 300);
      
      return () => clearTimeout(timeoutId);
    } else {
      // Show popular companies when input is empty
      fetchSuggestions('');
    }
  }, [onChange, fetchSuggestions]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectCompany(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  }, [showSuggestions, suggestions, selectedIndex]);

  // Handle company selection
  const handleSelectCompany = useCallback((company: CompanySuggestion) => {
    onChange(company.name);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    onSelect?.(company);
    inputRef.current?.blur();
  }, [onChange, onSelect]);

  // Show suggestions on focus
  const handleFocus = useCallback(() => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    } else {
      fetchSuggestions(value);
    }
  }, [suggestions.length, fetchSuggestions, value]);

  // Hide suggestions on blur (with delay for clicks)
  const handleBlur = useCallback(() => {
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 200);
  }, []);

  // Get company logo URL
  const getCompanyLogoUrl = useCallback((company: CompanySuggestion) => {
    if (!company.domain) return null;
    
    // Try Clearbit first, fallback to favicon
    return `https://logo.clearbit.com/${company.domain}`;
  }, []);

  // Get fallback favicon URL
  const getFaviconUrl = useCallback((company: CompanySuggestion) => {
    if (!company.domain) return null;
    return `https://${company.domain}/favicon.ico`;
  }, []);

  useEffect(() => {
    // Scroll selected item into view
    if (selectedIndex >= 0 && suggestionRefs.current[selectedIndex]) {
      suggestionRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [selectedIndex]);

  return (
    <div className="relative w-full">
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`${className} pr-8`}
        />
        <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-auto shadow-lg">
          <CardContent className="p-0">
            {loading && (
              <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                <Search className="mr-2 h-4 w-4 animate-pulse" />
                Searching companies...
              </div>
            )}
            
            {!loading && suggestions.length === 0 && value.trim() && (
              <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                <Building2 className="mr-2 h-4 w-4" />
                No companies found
              </div>
            )}
            
            {!loading && suggestions.map((company, index) => (
              <div
                key={`${company.name}-${index}`}
                ref={el => suggestionRefs.current[index] = el}
                className={`flex items-center gap-3 p-3 cursor-pointer transition-colors border-b last:border-b-0 ${
                  selectedIndex === index 
                    ? 'bg-accent text-accent-foreground' 
                    : 'hover:bg-accent hover:text-accent-foreground'
                }`}
                onClick={() => handleSelectCompany(company)}
              >
                {/* Company Logo */}
                <div className="flex-shrink-0 w-8 h-8 bg-muted rounded-md flex items-center justify-center overflow-hidden">
                  {company.domain ? (
                    <img
                      src={getCompanyLogoUrl(company)}
                      alt={`${company.name} logo`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to favicon
                        const target = e.target as HTMLImageElement;
                        target.src = getFaviconUrl(company) || '';
                        target.onerror = () => {
                          // Final fallback to icon
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        };
                      }}
                    />
                  ) : null}
                  <Building2 className={`h-4 w-4 text-muted-foreground ${company.domain ? 'hidden' : ''}`} />
                </div>

                {/* Company Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{company.name}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {company.industry && (
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        {company.industry}
                      </Badge>
                    )}
                    {company.domain && (
                      <span className="truncate">{company.domain}</span>
                    )}
                  </div>
                </div>

                {/* Additional Info */}
                {(company.size || company.location) && (
                  <div className="flex-shrink-0 text-xs text-muted-foreground">
                    {company.size && <div>{company.size}</div>}
                    {company.location && <div>{company.location}</div>}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CompanyAutocomplete;