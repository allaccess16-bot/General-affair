import { ActivitySection } from "@/components/home/activity-section";
import { Hero } from "@/components/home/hero";
import { InfoHub } from "@/components/home/info-hub";
import { KpiSection } from "@/components/home/kpi-section";
import { OpsStats } from "@/components/home/ops-stats";
import { ProcessBand } from "@/components/home/process-band";
import { ServiceCards } from "@/components/home/service-cards";

export default function HomePage() {
  return (
    <>
      <Hero />
      <ServiceCards />
      <KpiSection />
      <ActivitySection />
      <ProcessBand />
      <OpsStats />
      <InfoHub />
    </>
  );
}
