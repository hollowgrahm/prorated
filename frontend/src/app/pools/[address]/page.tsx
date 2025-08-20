import { PoolPage } from '@/components/pools/pool-page'

interface PoolPageProps {
  params: Promise<{
    address: string
  }>
}

export default async function Page({ params }: PoolPageProps) {
  const { address } = await params
  return <PoolPage address={address} />
}

export async function generateMetadata({ params }: PoolPageProps) {
  const { address } = await params
  
  return {
    title: `Pool ${address.slice(0, 6)}...${address.slice(-4)} | Prorated Protocol`,
    description: `View and participate in the funding pool at ${address}`,
  }
}
