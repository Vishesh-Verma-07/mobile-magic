"use client";

import { cn } from "@/lib/utils";
import { PlusCircle, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type RecentProject = {
  id: string;
  description: string | null;
  createdAt?: string;
};

type SidebarProps = {
  projects: RecentProject[];
  selectedProjectId?: string;
  isLoading: boolean;
  isOpen: boolean;
  onSelectProject: (projectId: string) => void;
  className?: string;
};

export function Sidebar({
  projects,
  selectedProjectId,
  isLoading,
  isOpen,
  onSelectProject,
  className,
}: SidebarProps) {
  const [search, setSearch] = useState("");

  const filteredProjects = projects.filter((p) =>
    (p.description || "Untitled project")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-slate-200/80 bg-slate-50 transition-all duration-300 ease-in-out",
        isOpen
          ? "w-64 translate-x-0 opacity-100"
          : "w-0 -translate-x-full opacity-0 overflow-hidden border-r-0 lg:w-0",
        className,
      )}
    >
      <div className="flex h-13 shrink-0 items-center border-b border-slate-200/80 px-4">
        <Link
          href="/"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 h-8 text-[11px] font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
        >
          <PlusCircle size={14} />
          New Project
        </Link>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden px-2 py-4">
        <div className="relative mb-4 px-2">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={14}
          />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-[11px] outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-400/10"
          />
        </div>

        <div className="flex-1 space-y-0.5 overflow-y-auto px-2">
          <h2 className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Recent Projects
          </h2>

          {isLoading && (
            <div className="px-2 py-4">
              <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
              <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-slate-200" />
            </div>
          )}

          {!isLoading && filteredProjects.length === 0 && (
            <p className="px-2 py-4 text-xs italic text-slate-400">
              {search ? "No matches found" : "No projects yet"}
            </p>
          )}

          {filteredProjects.map((project) => {
            const isSelected = project.id === selectedProjectId;
            return (
              <button
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className={cn(
                  "group flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2.5 transition-colors text-left",
                  isSelected
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <span className="line-clamp-1 text-[13px] font-medium leading-normal">
                  {project.description?.trim() || "Untitled Project"}
                </span>
                <span
                  className={cn(
                    "text-[10px] tabular-nums",
                    isSelected
                      ? "text-slate-500"
                      : "text-slate-400 group-hover:text-slate-500",
                  )}
                >
                  {project.createdAt
                    ? new Date(project.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    : "Recently"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
