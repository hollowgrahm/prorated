import { ProjectPage } from '@/components/projects/project-page'

interface ProjectPageProps {
  params: Promise<{
    address: string
  }>
}

export default async function ProjectPageRoute({ params }: ProjectPageProps) {
  const { address } = await params
  return <ProjectPage address={address} />
}
