import { DashboardNoteDetailPage } from '@/components/dashboard/note-detail-page'

export default async function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return <DashboardNoteDetailPage noteId={id} />
}
