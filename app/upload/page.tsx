import { sql } from '@/lib/db'
import { UploadClient } from '@/components/upload/UploadClient'

export const dynamic = 'force-dynamic'

export default async function UploadPage() {
  const uploads = await sql`SELECT * FROM csv_uploads ORDER BY uploaded_at DESC LIMIT 20`
  return <UploadClient uploads={uploads as any} />
}
