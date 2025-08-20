import { Metadata } from 'next'
import { PoolDiscovery } from '@/components/pools/pool-discovery'

export const metadata: Metadata = {
  title: 'Discover Fundraising Pools | Prorated Protocol',
  description: 'Browse active and upcoming DAO fundraising pools. Find projects to support and contribute to their success.',
}

export default function PoolsPage() {
  return <PoolDiscovery />
}
