import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";

export const metadata = {
  title: "Аналитика | База знаний",
};

export default function AnalyticsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Аналитика</h1>
      <AnalyticsDashboard />
    </div>
  );
}
