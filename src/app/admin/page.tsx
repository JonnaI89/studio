
import { CheckInDashboard } from "@/components/kartpass/check-in-dashboard";

export default async function AdminPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <CheckInDashboard />
    </main>
  );
}
