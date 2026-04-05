"use client";

import { AppHeader } from "@/components/layout/app-header";
import { Sidebar } from "@/components/layout/sidebar";
import { useActions } from "@/hooks/useActions";
import { usePrompts } from "@/hooks/usePromp.ts";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [prompt, setPrompt] = useState("");

  const { getToken } = useAuth();
  const router = useRouter();
  const params = useParams<{ projectId: string }>();

  const projectId = useMemo(() => {
    const value = params?.projectId;
    return Array.isArray(value) ? value[0] : value;
  }, [params]);
  const prompts = usePrompts(projectId);
  const actions = useActions(projectId);

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

  const handleChatSubmit = async (event: FormEvent<HTMLFormElement>) => {
    console.log("Submitting prompt:", prompt);
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
      await axios.post(`${process.env.NEXT_PUBLIC_WORKER_URL}/prompt`, {
        prompt: trimmedPrompt,
        projectId,
      });
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
    <div className="flex h-screen flex-col overflow-hidden bg-white text-slate-900">
      <AppHeader
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <div className="flex flex-1 flex-row overflow-hidden">
        <Sidebar
          isOpen={isSidebarOpen}
          projects={projects}
          selectedProjectId={projectId}
          isLoading={isProjectsLoading}
          onSelectProject={(selectedId) => {
            router.push(`/project/${selectedId}`);
          }}
          className="fixed inset-y-0 left-0 top-13 z-20 flex w-64 lg:static lg:top-0"
        />

        {isSidebarOpen && (
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-10 bg-slate-900/10 backdrop-blur-[1px] transition-opacity lg:hidden"
            aria-label="Close sidebar"
          />
        )}

        <main className="flex flex-1 flex-col overflow-hidden bg-slate-50">
          <section className="flex flex-1 p-3 overflow-hidden">
            <div className="mx-auto flex h-full w-full max-w-400 flex-col gap-3">
              <div className="grid h-full w-full flex-1 gap-3 overflow-hidden xl:grid-cols-[350px_1fr]">
                <section className="flex flex-col min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="shrink-0 border-b border-slate-200 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Chat Workspace
                    </p>
                    <h1 className="mt-0.5 text-base font-semibold text-slate-900 truncate">
                      {selectedProject?.description?.trim() ||
                        "Untitled project"}
                    </h1>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-slate-50/50 p-3 scroll-smooth">
                    <div className="mx-auto flex w-full max-w-md flex-col gap-2.5">
                      {prompts.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/90 px-4 py-5 text-center text-sm text-slate-500">
                          Start with a prompt and your conversation will appear
                          here.
                        </div>
                      )}

                      {prompts?.map((prompt) => (
                        <div key={prompt.id} className={`flex justify-end`}>
                          <div
                            className={`w-fit max-w-80 rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap wrap-break-word shadow-sm  bg-slate-900 text-white `}
                          >
                            {prompt.type === "USER" ? prompt.content : null}
                          </div>
                        </div>
                      ))}

                      {actions?.map((action) => (
                        <div key={action.id} className={`flex justify-start`}>
                          <div
                            className={`w-fit max-w-80 rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap wrap-break-word shadow-sm  bg-slate-200 text-slate-900 `}
                          >
                            {action.type === "FILE" ? (
                              <div className="flex flex-col gap-1.5">
                                <span className="font-semibold text-slate-700">
                                  File updated:
                                </span>
                                <pre className="max-h-60 overflow-y-auto whitespace-pre-wrap break-all rounded bg-slate-100 p-2 text-[11px] leading-normal font-mono">
                                  {action.content}
                                </pre>
                              </div>
                            ) : null}
                            {action.type === "SHELL" ? (
                              <div className="flex flex-col gap-1">
                                <span className="font-semibold text-slate-700">
                                  Command:
                                </span>
                                <code className="break-all rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-mono">
                                  {action.content}
                                </code>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <form
                    onSubmit={handleChatSubmit}
                    className="shrink-0 border-t border-slate-200 p-2"
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
                        placeholder="Type a prompt..."
                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-300/40"
                      />
                      <button
                        type="submit"
                        className="h-9 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-slate-700"
                      >
                        Send
                      </button>
                    </div>
                  </form>
                </section>

                <section className="flex flex-col min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="shrink-0 border-b border-slate-200 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Live Preview
                    </p>
                    <p className="mt-0.5 text-xs text-slate-700 truncate">
                      http://localhost:8080
                    </p>
                  </div>
                  <div className="flex-1 bg-slate-100/50">
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
      </div>
    </div>
  );
}
