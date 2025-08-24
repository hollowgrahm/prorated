import { HeroSection } from "@/components/landing/hero-section"
import { HowItWorks } from "@/components/landing/how-it-works"
import { FeaturesShowcase } from "@/components/landing/features-showcase"
import { ProtocolStats } from "@/components/landing/protocol-stats"
import { DemoInstructions } from "@/components/ui/demo-instructions"
import { NetworkHelper } from "@/components/ui/network-helper"

export default function Home() {
  return (
    <div className="overflow-hidden">
      <HeroSection />
      
      {/* Demo Setup Section */}
      <section className="py-16 bg-background/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-6">
            <NetworkHelper />
            <DemoInstructions />
          </div>
        </div>
      </section>
      
      <HowItWorks />
      <FeaturesShowcase />
      <ProtocolStats />
    </div>
  );
}
