"use client";

import { useState } from "react";
import { ContentStats } from "./widgets/ContentStats";
import { QualityIssues } from "./widgets/QualityIssues";
import { PopularArticles } from "./widgets/PopularArticles";
import { TopAuthors } from "./widgets/TopAuthors";
import { RecentActivity } from "./widgets/RecentActivity";
import { SearchAnalytics } from "./widgets/SearchAnalytics";
import { ActivityChart } from "./charts/ActivityChart";

type Tab = "overview" | "content" | "activity" | "search";

const tabs = [
  { id: "overview" as const, label: "Обзор" },
  { id: "content" as const, label: "Контент" },
  { id: "activity" as const, label: "Активность" },
  { id: "search" as const, label: "Поиск" },
];

export function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [period, setPeriod] = useState("30d");

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm rounded-t transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}

        {/* Period selector */}
        <div className="ml-auto">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="text-sm border border-border rounded px-2 py-1 bg-background"
          >
            <option value="7d">7 дней</option>
            <option value="30d">30 дней</option>
            <option value="90d">90 дней</option>
          </select>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ContentStats />
          <QualityIssues />
          <div className="lg:col-span-2">
            <ActivityChart period={period} />
          </div>
          <PopularArticles period={period} />
          <TopAuthors period={period} />
        </div>
      )}

      {activeTab === "content" && (
        <div className="space-y-6">
          <ContentStats detailed />
          <QualityIssues detailed />
        </div>
      )}

      {activeTab === "activity" && (
        <div className="space-y-6">
          <ActivityChart period={period} detailed />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopAuthors period={period} />
            <RecentActivity />
          </div>
        </div>
      )}

      {activeTab === "search" && <SearchAnalytics period={period} />}
    </div>
  );
}
