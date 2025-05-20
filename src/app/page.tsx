import { Dashboard } from '@/components/dashboard'
import SyncManager from '@/components/SyncManager'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="w-64 border-r p-4 bg-muted/40">
        <nav className="space-y-2">
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link href="/">Dashboard</Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link href="/contacts">Contacts</Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link href="/analytics">Analytics</Link>
          </Button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <h1 className="text-3xl font-bold">Finsculpt CRM</h1>
          <Separator />
          <Dashboard />
          <Separator className="my-6" />
          <SyncManager />
        </div>
      </div>
    </div>
  );
}
