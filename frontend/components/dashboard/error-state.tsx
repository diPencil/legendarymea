import { AlertTriangle } from 'lucide-react'

export function ErrorState({ title, description, retry }: { title: string, description: string, retry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 rounded-lg border bg-card text-card-foreground shadow-sm">
      <AlertTriangle className="h-10 w-10 text-destructive" />
      <div className="space-y-1">
        <h3 className="font-semibold tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {retry && (
        <button onClick={retry} className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
          Retry
        </button>
      )}
    </div>
  )
}
