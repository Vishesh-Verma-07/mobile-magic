"use client";

import { useState } from "react";

type RecentProject = {
  id: string;
  description: string | null;
  createdAt?: string;
};

type RecentProjectsSidebarProps = {
  projects: RecentProject[];
  selectedProjectId?: string;
  isLoading: boolean;
  errorMessage?: string;
  onSelectProject: (projectId: string) => void;
  collapsible?: boolean;
};

export function RecentProjectsSidebar({
  projects,
  selectedProjectId,
  isLoading,
  errorMessage,
  onSelectProject,
  collapsible = true,
}: RecentProjectsSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <aside className="w-full rounded-2xl border border-slate-200 bg-white p-4 lg:sticky lg:top-6 lg:max-w-xs lg:self-start">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {collapsible && (
            <button
              type="button"
              aria-label="Toggle recent projects"
              aria-expanded={isOpen}
              onClick={() => setIsOpen((current) => !current)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300/40 lg:hidden"
            >
              <span className="sr-only">Toggle sidebar</span>
              <span className="flex flex-col gap-1">
                <span className="h-0.5 w-4 rounded bg-current" />
                <span className="h-0.5 w-4 rounded bg-current" />
                <span className="h-0.5 w-4 rounded bg-current" />
              </span>
            </button>
          )}
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
            Recent Projects
          </h2>
        </div>
        {isLoading && (
          <span className="text-[11px] text-slate-500">Loading...</span>
        )}
      </div>

      <div
        className={
          collapsible ? `${isOpen ? "block" : "hidden"} lg:block` : "block"
        }
      >
        {errorMessage && (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700">
            {errorMessage}
          </p>
        )}

        {!isLoading && projects.length === 0 && (
          <p className="text-xs text-slate-500">
            No projects yet. Create one to see it here.
          </p>
        )}

        <div className="space-y-2">
          {projects.map((project) => {
            const isSelected = project.id === selectedProjectId;
            return (
              <button
                key={project.id}
                type="button"
                onClick={() => onSelectProject(project.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                  isSelected
                    ? "border-slate-800 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-400"
                }`}
              >
                <p className="line-clamp-1 text-sm font-medium">
                  {project.description?.trim() || "Untitled project"}
                </p>
                <p
                  className={`mt-1 text-[11px] ${
                    isSelected ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  {project.createdAt
                    ? new Date(project.createdAt).toLocaleDateString()
                    : "Recently created"}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
