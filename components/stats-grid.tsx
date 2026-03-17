import { Card } from "@/components/card";
import type { DashboardStats } from "@/lib/types";

export function StatsGrid({ stats }: { stats: DashboardStats }) {
  const items = [
    {
      label: "Moments Shared",
      value: stats.completedCalls,
      detail: "Each completed family call adds one more shared moment to your circle."
    },
    {
      label: "Time Together",
      value: stats.totalMinutes,
      detail: "A simple running view of Time Together across completed calls."
    },
    {
      label: "Family Connections",
      value: stats.uniqueConnectedThisWeek,
      detail: "Unique relatives who showed up in a completed call this week."
    },
    {
      label: "Reconnection Streak",
      value: `${stats.weeklyStreak} week${stats.weeklyStreak === 1 ? "" : "s"}`,
      detail: "Consecutive weeks with at least one completed family call."
    },
    {
      label: "Connection Score",
      value: stats.connectionScore,
      detail: "Earned by completing calls, staying long, including more people, and re-connecting after a gap."
    }
  ];

  return (
    <div className="stats-grid">
      {items.map((item) => (
        <Card className="counter-card" key={item.label}>
          <p className="stat-label">{item.label}</p>
          <p className="stat-value">{item.value}</p>
          <p className="meta">{item.detail}</p>
        </Card>
      ))}
    </div>
  );
}
