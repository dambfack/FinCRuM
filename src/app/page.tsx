import Dashboard from '@/components/Dashboard'
import SyncManager from '@/components/SyncManager'
import { Separator } from '@/components/ui/separator'

export default function Home() {
  return (
    <div className="space-y-6">
      <Dashboard />
      <Separator className="my-6" />
      <SyncManager />
    </div>
  );
}
