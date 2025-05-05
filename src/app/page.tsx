import Dashboard from '@/components/Dashboard';
import SyncManager from '@/components/SyncManager'; // Import SyncManager
import { Separator } from '@/components/ui/separator';

export default function Home() {
  // For now, we will pass empty stats. This will be updated later based on actual data.
   // We need to fetch this data properly in a real app, possibly client-side after loading from storage.
  const stats = {
    totalCustomers: 0, // Placeholder
    newCustomersToday: 0, // Placeholder
    // Add more stats as needed based on data analysis
  };

  // In a real app, you'd fetch/calculate stats, potentially using useEffect if data loads client-side
  // For now, we use placeholders. If using localStorage, stats could be calculated in a useEffect in the Dashboard component.


  return (
      <div className="space-y-6">
        <Dashboard stats={stats} />
        <Separator />
        <SyncManager /> {/* Add the SyncManager component */}
      </div>
  );
}
