import { HeroSection } from "@/components/landing/hero-section"
import { HowItWorks } from "@/components/landing/how-it-works"
import { FeaturesShowcase } from "@/components/landing/features-showcase"
import { ProtocolStats } from "@/components/landing/protocol-stats"

export default function Home() {
  return (
    <div className="overflow-hidden">
      <HeroSection />
      <HowItWorks />
      <FeaturesShowcase />
      <ProtocolStats />
    </div>
  );
}
