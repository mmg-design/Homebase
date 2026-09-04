type BrandChannel = { id: string; name: string; platform: string; url: string | null; color: string; avatar?: string; audienceLabel?: string; impressionsLabel?: string; hideViews?: boolean; primaryMetric?: 'followers' | 'impressions' | 'views'; primaryLabel?: string }

export const BRAND_CHANNELS: BrandChannel[] = [
  { id: 'youtube_mmg', name: 'MMG Design', platform: 'YouTube', url: 'https://www.youtube.com/@mmgdesign', color: '#ef4444', avatar: '/brand/headshot.jpg' },
  { id: 'youtube_andy', name: 'Andy the Marketer', platform: 'YouTube', url: 'https://www.youtube.com/@andythemarketer', color: '#ef4444', avatar: '/brand/andy-the-marketer.png' },
  { id: 'linkedin', name: 'MMG Design', platform: 'LinkedIn', url: 'https://www.linkedin.com/in/mmgdesign/', color: '#0a66c2', avatar: '/brand/headshot.jpg' },
  { id: 'x', name: 'MMG Design', platform: 'X', url: 'https://x.com/mmg__design', color: '#111827', avatar: '/brand/headshot.jpg' },
  { id: 'spotify', name: 'Marketing by Design', platform: 'Podcast', url: 'https://open.spotify.com/show/1A2CMXrHEjK4WVLeRzrR0j', color: '#1db954', avatar: '/brand/marketing-by-design.jpg', audienceLabel: 'Followers', impressionsLabel: 'Downloads', hideViews: true, primaryMetric: 'impressions', primaryLabel: 'Downloads' },
  { id: 'instagram', name: 'Mindful Milligan', platform: 'Instagram', url: 'https://www.instagram.com/mindfulmilligan/', color: '#d946ef', avatar: '/brand/headshot.jpg' },
  { id: 'columbus_marketing_jobs', name: 'Columbus Marketing Jobs', platform: 'Newsletter', url: null, color: '#f59e0b', avatar: '/brand/columbus-marketing-jobs.png', audienceLabel: 'Subscribers' },
  { id: 'site_spotlight', name: 'Site Spotlight', platform: 'Substack', url: null, color: '#52525b', avatar: '/brand/site-spotlight.jpg', audienceLabel: 'Subscribers' },
  { id: 'columbus_marketers', name: 'Columbus Marketers Community', platform: 'Community', url: null, color: '#dc2626', avatar: '/brand/columbus-marketers-community.jpg' },
] as const
