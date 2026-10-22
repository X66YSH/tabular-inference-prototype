export const SAMPLE_TARGET = "renewal";

// Entirely synthetic, deterministic demo data. Missing outcomes are interleaved
// with known outcomes so filtering and original-row alignment are easy to see.
export function createSampleFile() {
  const rows = [[
    "account_id", "plan", "region", "tenure_months", "monthly_usage_hours",
    "support_requests", "signup_date", SAMPLE_TARGET,
  ]];
  const plans = ["Starter", "Team", "Business"];
  const regions = ["North", "South", "East", "West"];

  for (let index = 0; index < 80; index += 1) {
    const tenure = 3 + (index * 7) % 60;
    const usage = 5 + (index * 13) % 90 + (index % 5) / 10;
    const support = (index * 3) % 7;
    const signup = new Date(Date.UTC(2021 + index % 4, (index * 7) % 12, 1 + (index * 3) % 27));
    const renewal = usage + tenure * 0.7 - support * 7 >= 46 ? 1 : 0;
    const missing = index % 5 === 0 && index < 75;
    rows.push([
      `DEMO-${String(index + 1).padStart(3, "0")}`,
      plans[index % plans.length],
      regions[(index * 3) % regions.length],
      tenure,
      usage.toFixed(1),
      support,
      signup.toISOString().slice(0, 10),
      missing ? "" : renewal,
    ]);
  }

  return new File(
    [rows.map((row) => row.join(",")).join("\n") + "\n"],
    "synthetic-renewals.csv",
    { type: "text/csv;charset=utf-8" },
  );
}
