import Dashboard from '@/components/Dashboard';
// SyncManager is typically part of the Dashboard or a global layout element now
import { Separator } from '@/components/ui/separator';

export default function Home() {
  // Stats are now fetched/calculated within the Dashboard component itself.
  // No need to pass stats from here unless there's a specific reason.

  return (
      <div className="space-y-6">
        <Dashboard />
        {/* The main SyncManager card might be part of the Dashboard layout or a separate section if desired.
            For now, assuming Dashboard handles primary sync display or a compact status.
            If a large SyncManager card is still needed here, ensure it doesn't conflict with Dashboard's sync UI.
        */}
        {/* <Separator /> */}
        {/* <SyncManager /> */} {/* Example: If a detailed SyncManager card is desired on the homepage */}
      </div>
  );
}
