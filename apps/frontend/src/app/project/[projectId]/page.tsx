"use client";

import { AppHeader } from "@/components/layout/app-header";
import { RecentProjectsSidebar } from "@/components/layout/recent-projects-sidebar";
import { usePrompts } from "@/hooks/usePromp.ts";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Project = {
  id: string;
  description: string | null;
  createdAt: string;
};

export default function ProjectWorkspacePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isProjectsLoading, setIsProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | undefined>(
    undefined,
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [prompt, setPrompt] = useState("");

  const { getToken } = useAuth();
  const router = useRouter();
  const params = useParams<{ projectId: string }>();

  const projectId = useMemo(() => {
    const value = params?.projectId;
    return Array.isArray(value) ? value[0] : value;
  }, [params]);
  const prompts = usePrompts(projectId);

  const fetchProjects = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setProjects([]);
      return;
    }

    setIsProjectsLoading(true);
    setProjectsError(undefined);

    try {
      const response = await axios.post<Project[]>(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/projects`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const sortedProjects = [...response.data].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setProjects(sortedProjects);
    } catch {
      setProjectsError("Could not load recent projects.");
    } finally {
      setIsProjectsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSidebarOpen]);

  const handleChatSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      return;
    }

    if (!projectId) {
      window.alert("Project ID is missing.");
      return;
    }

    const token = await getToken();

    if (!token) {
      console.log("No auth token found. Please sign in and try again.");
      window.alert("Please sign in to send prompts.");
      return;
    }

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_WORKER_URL ?? "http://localhost:9091"}/prompt`,
        { prompt: trimmedPrompt, projectId },
      );
      setPrompt("");
    } catch (error) {
      window.alert("Failed to send prompt.");
      console.log("Error sending prompt:", error);
    }
  };

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === projectId),
    [projects, projectId],
  );

  return (
    <main className="flex h-200 flex-col bg-slate-50 text-slate-900">
      <AppHeader />

      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close recent projects"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/35"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 top-16 z-40 w-full max-w-[320px] transform overflow-y-auto border-r border-slate-200 bg-slate-50 p-4 shadow-xl transition-transform duration-200 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <RecentProjectsSidebar
          projects={projects}
          selectedProjectId={projectId}
          isLoading={isProjectsLoading}
          errorMessage={projectsError}
          onSelectProject={(selectedId) => {
            setIsSidebarOpen(false);
            router.push(`/project/${selectedId}`);
          }}
        />
      </aside>

      <section className="flex flex-1 px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-5">
        <div className="mx-auto flex w-full max-w-400 flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 sm:px-4">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700 transition hover:bg-slate-100"
            >
              <span className="flex flex-col gap-1">
                <span className="h-0.5 w-4 rounded bg-current" />
                <span className="h-0.5 w-4 rounded bg-current" />
                <span className="h-0.5 w-4 rounded bg-current" />
              </span>
              Recent Projects
            </button>
            <Link
              href="/"
              className="text-xs font-medium text-slate-700 underline underline-offset-4"
            >
              Back to prompt page
            </Link>
          </div>

          <div className="grid w-full flex-1 gap-4 xl:min-h-0 xl:grid-cols-[380px_minmax(0,1fr)]">
            <section className="flex min-h-90 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:min-h-0">
              <div className="border-b border-slate-200 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Chat Workspace
                </p>
                <h1 className="mt-1 text-lg font-semibold text-slate-900">
                  {selectedProject?.description?.trim() || "Untitled project"}
                </h1>
                <p className="mt-1 text-xs text-slate-500">
                  Project ID: {projectId}
                </p>
              </div>

              <div className="min-h-0 flex-1 max-h-150 overflow-y-auto bg-slate-50/70 p-3 sm:p-4">
                <div className="mx-auto flex w-full max-w-md flex-col gap-3">
                  {prompts.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/90 px-4 py-5 text-center text-sm text-slate-500">
                      Start with a prompt and your conversation will appear
                      here.
                    </div>
                  )}

                  {prompts.map((prompt) => (
                    <div
                      key={prompt.id}
                      className={`flex ${
                        prompt.type === "USER" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`w-fit max-w-80 rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap wrap-break-word shadow-sm ${
                          prompt.type === "USER"
                            ? "bg-slate-900 text-white"
                            : "border border-slate-200 bg-white text-slate-800"
                        }`}
                      >
                        {prompt.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <form
                onSubmit={handleChatSubmit}
                className="border-t border-slate-200 p-3"
              >
                <label htmlFor="chat-input" className="sr-only">
                  Send a message
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="chat-input"
                    type="text"
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder="Type a prompt for this project..."
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-300/40"
                  />
                  <button
                    type="submit"
                    className="h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    Send
                  </button>
                </div>
              </form>
            </section>

            <section className="flex min-h-110 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:min-h-0">
              <div className="border-b border-slate-200 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Live Preview
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  http://localhost:8080
                </p>
              </div>
              <div className="flex-1 bg-slate-100/70 xl:min-h-0">
                <iframe
                  src="http://localhost:8080"
                  title="App preview"
                  className="h-full w-full border-0"
                  referrerPolicy="no-referrer"
                  allow="clipboard-read; clipboard-write"
                />
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
