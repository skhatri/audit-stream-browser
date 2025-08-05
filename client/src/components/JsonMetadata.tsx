import React from 'react';

interface JsonMetadataProps {
  metadata?: string;
  maxHeight?: string;
}

const JsonMetadata: React.FC<JsonMetadataProps> = ({ metadata, maxHeight = 'max-h-40' }) => {
  if (!metadata || metadata === '{}' || metadata === '-') {
    return <span className="text-gray-400 text-sm">-</span>;
  }

  // Try to parse as JSON first, if it fails, treat as Java Map string
  let formattedMetadata: string;
  let isValidJson = false;

  try {
    const parsed = JSON.parse(metadata);
    formattedMetadata = JSON.stringify(parsed, null, 2);
    isValidJson = true;
  } catch {
    // Handle Java Map format like {key=value, key2=value2}
    formattedMetadata = metadata
      .replace(/^\{/, '{\n  ')
      .replace(/\}$/, '\n}')
      .replace(/, /g, ',\n  ')
      .replace(/=/g, ': ');
  }

  // Apply syntax highlighting to JSON
  const highlightJson = (jsonString: string): string => {
    if (!isValidJson) return jsonString;
    
    return jsonString
      .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
      .replace(/: "([^"]+)"/g, ': <span class="json-string">"$1"</span>')
      .replace(/: (\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
      .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
      .replace(/: null/g, ': <span class="json-null">null</span>');
  };

  const shouldShowToggle = formattedMetadata.split('\n').length > 3 || formattedMetadata.length > 100;

  return (
    <div className="relative">
      {shouldShowToggle ? (
        <details className="cursor-pointer group">
          <summary className="text-blue-600 hover:text-blue-800 text-sm font-medium list-none flex items-center">
            <svg 
              className="w-4 h-4 mr-1 transition-transform group-open:rotate-90" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Payload
          </summary>
          <div className={`mt-2 ${maxHeight} overflow-auto`}>
            <pre className={`text-xs bg-gray-50 text-gray-800 p-3 rounded-md font-mono leading-relaxed whitespace-pre-wrap border border-gray-200 ${
              isValidJson ? 'json-syntax-light' : ''
            }`}>
              <code 
                dangerouslySetInnerHTML={{ 
                  __html: highlightJson(formattedMetadata) 
                }}
              />
            </pre>
          </div>
        </details>
      ) : (
        <pre className={`text-xs bg-gray-50 text-gray-800 p-2 rounded font-mono leading-relaxed whitespace-pre-wrap border border-gray-200 ${
          isValidJson ? 'json-syntax-light' : ''
        }`}>
          <code 
            dangerouslySetInnerHTML={{ 
              __html: highlightJson(formattedMetadata) 
            }}
          />
        </pre>
      )}
    </div>
  );
};

export default JsonMetadata;