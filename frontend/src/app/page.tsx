import { Web3Test } from "@/components/web3-test";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight">
              <span className="gradient-text">Prorated Protocol</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Crowdfunding platform for launching tokens with integrated DEX, lending, and governance
            </p>
          </div>
          
          <div className="flex justify-center">
            <Web3Test />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-16">
            <div className="glass p-6 rounded-lg text-center">
              <h3 className="text-lg font-semibold mb-2">🚀 Crowdfunding</h3>
              <p className="text-sm text-muted-foreground">
                Launch token projects through community funding rounds
              </p>
            </div>
            <div className="glass p-6 rounded-lg text-center">
              <h3 className="text-lg font-semibold mb-2">⚡ DEX Trading</h3>
              <p className="text-sm text-muted-foreground">
                Automatic Proswap deployment with 80/20 weighted pools
              </p>
            </div>
            <div className="glass p-6 rounded-lg text-center">
              <h3 className="text-lg font-semibold mb-2">🏛️ Governance</h3>
              <p className="text-sm text-muted-foreground">
                DAO voting with veNFT power based on LP lock duration
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
