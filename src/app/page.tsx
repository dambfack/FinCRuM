import Dashboard from '@/components/Dashboard';
import SyncManager from '@/components/SyncManager'; // Import SyncManager
import { Separator } from '@/components/ui/separator';

export default function Home() {
  // Stats are now fetched/calculated within the Dashboard component itself.
  // No need to pass stats from here unless there's a specific reason.

  return (
      <div className="space-y-6">
        <Dashboard />
        <Separator className="my-6" /> {/* Added Separator for better visual distinction */}
        <SyncManager /> {/* Uncommented SyncManager to display it on the homepage */}
      </div>
  );
}
