import { CheckInDashboard } from "@/components/kartpass/check-in-dashboard";
import { getRacesForDate } from '@/services/race-service';
import { format } from 'date-fns';

export default async function AdminPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const todaysRaces = await getRacesForDate(today);

  return (
    <main className="flex min-h-screen flex-col p-4 sm:p-8 md:p-12">
      <CheckInDashboard todaysRaces={todaysRaces} />
    </main>
  );
}
