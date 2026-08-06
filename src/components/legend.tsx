import type { Project } from '@/lib/types'

export function Legend({ projects }: { projects: Project[] }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm">
      {projects.map((project) => (
        <span key={project.id} className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-sm"
            style={{ backgroundColor: project.color }}
          />
          {project.name}
        </span>
      ))}
    </div>
  )
}
