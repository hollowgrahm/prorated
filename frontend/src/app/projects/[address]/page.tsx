'use client'

import { ProjectPage } from '@/components/projects/project-page'

interface ProjectPageProps {
  params: {
    address: string
  }
}

export default function ProjectPageRoute({ params }: ProjectPageProps) {
  return <ProjectPage address={params.address} />
}
