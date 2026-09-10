import { NextRequest, NextResponse } from 'next/server'
import { getAppUrl } from '@/lib/brand-stats'

export async function GET(request: NextRequest) {
  const appId = process.env.FACEBOOK_APP_ID
  if (!appId) return NextResponse.redirect(new URL('/brand-stats?setup=instagram', request.url))
  const callback = `${getAppUrl()}/api/auth/instagram/callback`
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: callback,
    response_type: 'code',
    scope: 'pages_show_list,pages_read_engagement,instagram_basic',
  })
  return NextResponse.redirect(`https://www.facebook.com/v22.0/dialog/oauth?${params}`)
}
