import { NextRequest, NextResponse } from 'next/server'
import { ensureBrandStatsTables, getAppUrl } from '@/lib/brand-stats'
import { sql } from '@/lib/db'

const GRAPH_VERSION = 'v22.0'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const appId = process.env.FACEBOOK_APP_ID
  const appSecret = process.env.FACEBOOK_APP_SECRET
  if (!code || !appId || !appSecret) return NextResponse.redirect(new URL('/brand-stats?connection=failed', request.url))
  const callback = `${getAppUrl()}/api/auth/instagram/callback`

  // Exchange the auth code for a short-lived user token, then upgrade to a long-lived one (~60 days).
  const shortLivedParams = new URLSearchParams({ client_id: appId, client_secret: appSecret, redirect_uri: callback, code })
  const shortLivedResponse = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?${shortLivedParams}`)
  const shortLived = await shortLivedResponse.json()
  if (!shortLivedResponse.ok || !shortLived.access_token) return NextResponse.redirect(new URL('/brand-stats?connection=failed', request.url))

  const longLivedParams = new URLSearchParams({ grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret, fb_exchange_token: shortLived.access_token })
  const longLivedResponse = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?${longLivedParams}`)
  const longLived = await longLivedResponse.json()
  const userToken = longLived.access_token || shortLived.access_token

  // Find the Facebook Page connected to this user, and the Instagram Business account behind it.
  const pagesResponse = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/me/accounts?fields=access_token,instagram_business_account&access_token=${userToken}`)
  const pages = await pagesResponse.json()
  const page = pages.data?.find((item: { instagram_business_account?: { id: string } }) => item.instagram_business_account?.id)
  if (!pagesResponse.ok || !page) return NextResponse.redirect(new URL('/brand-stats?connection=failed', request.url))

  await ensureBrandStatsTables()
  // Page access tokens derived from a long-lived user token do not expire, so this can be reused indefinitely.
  await sql`INSERT INTO brand_connections (channel_id, refresh_token, external_id, updated_at) VALUES ('instagram', ${page.access_token}, ${page.instagram_business_account.id}, now()) ON CONFLICT (channel_id) DO UPDATE SET refresh_token = EXCLUDED.refresh_token, external_id = EXCLUDED.external_id, updated_at = now()`
  return NextResponse.redirect(new URL('/brand-stats?connection=success', request.url))
}
