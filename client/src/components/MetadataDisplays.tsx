import React from 'react';

interface AmountDisplayProps {
  amount: string;
  currency: string;
  formatted?: string;
}

export const AmountDisplay: React.FC<AmountDisplayProps> = ({ amount, currency, formatted }) => {
  const displayAmount = formatted || `$${parseFloat(amount || '0').toFixed(2)}`;
  
  return (
    <div className="flex flex-col">
      <span className="font-semibold text-lg text-gray-900">
        {displayAmount}
      </span>
      <span className="text-xs text-gray-500">{currency}</span>
    </div>
  );
};

interface CompanySummaryProps {
  summary: string;
  region?: string;
}

export const CompanySummary: React.FC<CompanySummaryProps> = ({ summary, region }) => {
  const getIndustryIcon = (company: string) => {
    const companyLower = company.toLowerCase();
    
    // Telecom indicators
    if (companyLower.includes('telecom') || companyLower.includes('mobile') || 
        companyLower.includes('verizon') || companyLower.includes('at&t') || 
        companyLower.includes('t-mobile') || companyLower.includes('comcast') ||
        companyLower.includes('telstra') || companyLower.includes('optus') ||
        companyLower.includes('vodafone') || companyLower.includes('bt group') ||
        companyLower.includes('ee limited') || companyLower.includes('o2 uk') ||
        companyLower.includes('sky uk') || companyLower.includes('virgin media')) {
      return '📱';
    }
    
    // Energy/Gas indicators
    if (companyLower.includes('gas') || companyLower.includes('energy') || 
        companyLower.includes('kinder morgan') || companyLower.includes('enterprise products') ||
        companyLower.includes('enbridge') || companyLower.includes('williams') ||
        companyLower.includes('agl energy') || companyLower.includes('origin energy') ||
        companyLower.includes('british gas') || companyLower.includes('e.on') ||
        companyLower.includes('edf energy') || companyLower.includes('scottish power') ||
        companyLower.includes('sse') || companyLower.includes('bulb') ||
        companyLower.includes('octopus')) {
      return '⚡';
    }
    
    // Insurance indicators
    if (companyLower.includes('insurance') || companyLower.includes('berkshire hathaway') ||
        companyLower.includes('progressive') || companyLower.includes('allstate') ||
        companyLower.includes('travelers') || companyLower.includes('liberty mutual') ||
        companyLower.includes('farmers') || companyLower.includes('usaa') ||
        companyLower.includes('suncorp') || companyLower.includes('iag group') ||
        companyLower.includes('qbe') || companyLower.includes('allianz') ||
        companyLower.includes('nrma') || companyLower.includes('racv') ||
        companyLower.includes('aviva') || companyLower.includes('legal & general') ||
        companyLower.includes('admiral') || companyLower.includes('direct line') ||
        companyLower.includes('rsa insurance') || companyLower.includes('hastings') ||
        companyLower.includes('lv=')) {
      return '🛡️';
    }
    
    return '🏢';
  };

  const getRegionFlag = (region?: string) => {
    switch (region) {
      case 'US': return '🇺🇸';
      case 'AU': return '🇦🇺';
      case 'UK': return '🇬🇧';
      default: return '';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <span className="text-lg">{getIndustryIcon(summary)}</span>
      <div className="flex flex-col">
        <span className="font-medium text-gray-900">{summary}</span>
        {region && (
          <div className="flex items-center space-x-1">
            <span className="text-xs">{getRegionFlag(region)}</span>
            <span className="text-xs text-gray-500">{region}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Utility function to parse metadata
export const parseMetadata = (metadata?: string | object) => {
  if (!metadata) return {};
  
  // If it's already an object, return it
  if (typeof metadata === 'object') {
    return metadata;
  }
  
  // If it's a string, try to parse it
  if (typeof metadata === 'string') {
    try {
      // First try JSON parsing
      return JSON.parse(metadata);
    } catch (e) {
      try {
        // If JSON parsing fails, try to parse Java Map string format
        // e.g., "{key1=value1, key2=value2, key3=value3}"
        if (metadata.startsWith('{') && metadata.endsWith('}')) {
          const content = metadata.slice(1, -1); // Remove braces
          const pairs = content.split(', ');
          const result: any = {};
          
          pairs.forEach(pair => {
            const [key, ...valueParts] = pair.split('=');
            if (key && valueParts.length > 0) {
              const value = valueParts.join('=').trim();
              result[key.trim()] = value;
            }
          });
          
          return result;
        }
      } catch (mapParseError) {
        console.warn('Failed to parse metadata as Java Map format:', metadata);
      }
      
      console.warn('Failed to parse metadata:', metadata);
      return {};
    }
  }
  
  return {};
};