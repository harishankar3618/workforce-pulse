#!/usr/bin/env ts-node
import getAnalytics, { clearAnalyticsCache } from "../src/lib/etl/index.ts";

async function run() {
  console.log("Running ETL verification...");
  clearAnalyticsCache();
  try {
    const analytics = await getAnalytics(true);
    console.log("Generated at:", analytics.generatedAt);
    console.log(`Rows total (dateRange): ${analytics.dateRange.start} → ${analytics.dateRange.end}`);
    console.log("Headline:", analytics.headline);
    console.log("Top 5 tasks by APS:");
    analytics.tasks.slice(0, 5).forEach((t) => {
      console.log(`  ${t.rank}. ${t.taskCategory} — APS:${t.aps} | Vol:${t.totalMinutes}min | Rep:${(t.repRate*100).toFixed(0)}% | INR: ₹${t.inrImpactMonth}`);
    });
    console.log("Anomalies:", analytics.anomalies.map((a) => ({ id: a.id, type: a.type, title: a.title })));
    console.log("Data quality summary:");
    console.log(`  rowsTotal: ${analytics.quality.rowsTotal}`);
    console.log(`  rowsClean: ${analytics.quality.rowsClean}`);
    console.log(`  rowsDropped: ${analytics.quality.rowsDropped}`);
    console.log(`  employees analyzed: ${analytics.employees.length}`);
    console.log(`  orphan employees (no activity): ${analytics.quality.employeeIssues.noActivity.length}`);
    console.log(`  missing metadata employees: ${analytics.quality.employeeIssues.missingMetadata.join(", ")}`);
    console.log("Verification complete.");
    process.exit(0);
  } catch (err) {
    console.error("ETL verification failed:", err);
    process.exit(2);
  }
}

run();
