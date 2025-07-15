
import { CheckInDashboard } from "@/components/kartpass/check-in-dashboard";
import { getRacesForDate } from '@/services/race-service';
import { format } from 'date-fns';

export default async function AdminPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const todaysRaces = await getRacesForDate(today);

  return (
    <main className="flex min-h-screen flex-col">
      <CheckInDashboard todaysRaces={todaysRaces} />
    </main>
  );
}
