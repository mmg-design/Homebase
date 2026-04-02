import { sql } from '@/lib/db'
import { UploadClient } from '@/components/upload/UploadClient'

export const dynamic = 'force-dynamic'

export default async function UploadPage() {
  const [uploads, companies] = await Promise.all([
    sql`SELECT * FROM csv_uploads ORDER BY uploaded_at DESC LIMIT 20`,
    sql`SELECT id, name, slug FROM companies ORDER BY name`,
  ])
  return <UploadClient uploads={uploads as any} companies={companies as any} />
}
