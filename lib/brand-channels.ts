type BrandChannel = { id: string; name: string; platform: string; url: string | null; color: string; avatar?: string }

export const BRAND_CHANNELS: BrandChannel[] = [
  { id: 'youtube_mmg', name: 'MMG Design', platform: 'YouTube', url: 'https://www.youtube.com/@mmgdesign', color: '#ef4444', avatar: '/brand/headshot.jpg' },
  { id: 'youtube_andy', name: 'Andy the Marketer', platform: 'YouTube', url: 'https://www.youtube.com/@andythemarketer', color: '#ef4444' },
  { id: 'linkedin', name: 'MMG Design', platform: 'LinkedIn', url: 'https://www.linkedin.com/in/mmgdesign/', color: '#0a66c2', avatar: '/brand/headshot.jpg' },
  { id: 'x', name: 'MMG Design', platform: 'X', url: 'https://x.com/mmg__design', color: '#111827', avatar: '/brand/headshot.jpg' },
  { id: 'spotify', name: 'The Creative Journal', platform: 'Podcast', url: 'https://open.spotify.com/show/1A2CMXrHEjK4WVLeRzrR0j', color: '#1db954' },
  { id: 'instagram', name: 'Mindful Milligan', platform: 'Instagram', url: 'https://www.instagram.com/mindfulmilligan/', color: '#d946ef', avatar: '/brand/headshot.jpg' },
  { id: 'columbus_marketers', name: 'Columbus Marketers Community', platform: 'Community', url: null, color: '#dc2626' },
] as const
