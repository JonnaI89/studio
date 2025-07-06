import { CheckInDashboard } from "@/components/kartpass/check-in-dashboard";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12">
      <CheckInDashboard />
    </main>
  );
}
