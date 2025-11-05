// API Configuration
export const config = {
  // Azure OpenAI Configuration
  azure: {
    apiUrl: process.env.AZURE_API_TARGET_URL || '',
    apiKey: process.env.AZURE_API_KEY || '',
    transcriptionUrl: process.env.AZURE_TRANSCRIPTION_TARGET_URL || '',
  },
  
  // TFL API Configuration
  tfl: {
    baseUrl: 'https://api.tfl.gov.uk',
    apiKey: process.env.NEXT_PUBLIC_TFL_API_KEY || '',
  },
  
  // Geocoding Configuration
  geocoding: {
    apiKey: process.env.GEOCODING_API_KEY || '',
    provider: process.env.GEOCODING_PROVIDER || 'google', // 'google' or 'mapbox'
  },
  
  // Supabase Configuration
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  
  // App Configuration
  app: {
    name: 'Spitro',
    description: 'Open-source natural language journey planning for London',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
  
  // Feature Flags
  features: {
    enableVoiceInput: process.env.NEXT_PUBLIC_ENABLE_VOICE_INPUT === 'true',
    enableGeolocation: process.env.NEXT_PUBLIC_ENABLE_GEOLOCATION !== 'false', // Default true
    enableDebugMode: process.env.NODE_ENV === 'development',
  },
  
  // Rate Limiting
  rateLimit: {
    tflRequestsPerMinute: 60,
    azureRequestsPerMinute: 30,
    geocodingRequestsPerMinute: 100,
  },
}

// Validation function to ensure required environment variables are set
export function validateConfig() {
  const errors: string[] = []
  
  if (!config.azure.apiUrl) errors.push('AZURE_API_TARGET_URL is required')
  if (!config.azure.apiKey) errors.push('AZURE_API_KEY is required')
  
  // TFL API key is optional as the API works without it (but with lower rate limits)
  
  if (!config.geocoding.apiKey && config.features.enableGeolocation) {
    errors.push('GEOCODING_API_KEY is required when geolocation is enabled')
  }
  
  if (!config.supabase.url) errors.push('NEXT_PUBLIC_SUPABASE_URL is required')
  if (!config.supabase.anonKey) errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
  
  if (errors.length > 0) {
    console.error('Configuration errors:', errors)
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`)
    }
  }
  
  return errors.length === 0
}
