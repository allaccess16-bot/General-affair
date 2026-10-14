import { ActivitySection } from "@/components/home/activity-section";
import { AdminInsight } from "@/components/home/admin-insight";
import { Hero } from "@/components/home/hero";
import { InfoHub } from "@/components/home/info-hub";
import { KpiSection } from "@/components/home/kpi-section";
import { ModuleCards } from "@/components/home/module-cards";
import { OpsStats } from "@/components/home/ops-stats";
import { ProcessBand } from "@/components/home/process-band";

export default function HomePage() {
  return (
    <>
      <Hero />
      <KpiSection />
      <ModuleCards />
      <ActivitySection />
      <ProcessBand />
      <AdminInsight />
      <OpsStats />
      <InfoHub />
    </>
  );
}
