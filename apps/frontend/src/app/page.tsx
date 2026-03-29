"use client";

import { AppFooter } from "@/components/layout/app-footer";
import { AppHeader } from "@/components/layout/app-header";
import { RecentProjectsSidebar } from "@/components/layout/recent-projects-sidebar";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Project = {
  id: string;
  description: string | null;
  createdAt: string;
};

const starterApps = [
  {
    name: "Portfolio Site",
    category: "Personal",
    prompt:
      "Build a modern portfolio website with a hero section, project gallery, and contact form.",
  },
  {
    name: "Task Tracker",
    category: "Productivity",
    prompt:
      "Create a clean task tracker app with due dates, labels, and drag-and-drop columns.",
  },
  {
    name: "Recipe Hub",
    category: "Food",
    prompt:
      "Make a recipe discovery app with search, filters, and a save-to-favorites feature.",
  },
  {
    name: "Fitness Coach",
    category: "Health",
    prompt:
      "Generate a fitness planner app with workout plans, progress charts, and daily reminders.",
  },
  {
    name: "Startup Landing",
    category: "Business",
    prompt:
      "Design a startup landing page with pricing, testimonials, and a newsletter signup.",
  },
  {
    name: "Travel Planner",
    category: "Travel",
    prompt:
      "Build a travel planning app with itinerary timeline, map view, and budget tracker.",
  },
];

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [isProjectsLoading, setIsProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | undefined>(
    undefined,
  );
  const { getToken } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedProjectId = searchParams.get("projectId") ?? undefined;

  const handleProjectSelect = (projectId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("projectId", projectId);
    router.push(`${pathname}?${params.toString()}`);
  };

  const fetchProjects = async () => {
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
  };

  useEffect(() => {
    fetchProjects();
    // This should run once on mount for initial sidebar data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedProjectTitle = useMemo(() => {
    if (!selectedProjectId) {
      return undefined;
    }
    return projects.find((project) => project.id === selectedProjectId)
      ?.description;
  }, [projects, selectedProjectId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const token = await getToken();
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      return;
    }

    if (!token) {
      console.log("No auth token found. Please sign in and try again.");
      window.alert("Please sign in to create a project.");
      return;
    }

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/project`,
        { prompt: trimmedPrompt },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const newProjectId = response.data?.ProjectId as string | undefined;
      if (newProjectId) {
        handleProjectSelect(newProjectId);
      }
      await fetchProjects();
      console.log(response.data);
    } catch (error) {
      window.alert(error);
      console.log("Error creating project:", error);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-white text-slate-900">
      <AppHeader />

      <section className="flex flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 lg:flex-row lg:items-start">
          <RecentProjectsSidebar
            projects={projects}
            selectedProjectId={selectedProjectId}
            isLoading={isProjectsLoading}
            errorMessage={projectsError}
            onSelectProject={handleProjectSelect}
          />

          <div className="w-full">
            <div className="mx-auto max-w-3xl text-center">
              <p className="mb-3 inline-flex rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-600">
                Build any app with a prompt
              </p>
              <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                What do you want to build today?
              </h1>
              <p className="mt-4 text-sm text-slate-600 sm:text-base">
                Describe your app idea, and we will generate a
                ready-to-customize website layout in seconds.
              </p>
              {selectedProjectId && (
                <p className="mt-3 text-xs text-slate-500">
                  Viewing project:{" "}
                  <span className="font-medium text-slate-700">
                    {selectedProjectTitle?.trim() || selectedProjectId}
                  </span>
                </p>
              )}
            </div>

            <form
              onSubmit={handleSubmit}
              className="mx-auto mt-9 flex w-full max-w-3xl flex-col gap-3 sm:flex-row"
            >
              <input
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Example: Create a SaaS dashboard with analytics, team management, and billing pages"
                className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-300/35"
                aria-label="Describe the app you want to build"
              />
              <button
                type="submit"
                className="h-14 rounded-2xl bg-slate-900 px-7 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/40"
              >
                Build App
              </button>
            </form>

            <div className="mx-auto mt-12 max-w-4xl">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600">
                  Start from a default app
                </h2>
                <span className="text-xs text-slate-500">
                  Tap one to autofill the prompt
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {starterApps.map((app) => (
                  <button
                    key={app.name}
                    type="button"
                    onClick={() => setPrompt(app.prompt)}
                    className="group rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-sm"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {app.category}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {app.name}
                    </p>
                    <p className="mt-1.5 line-clamp-2 text-xs text-slate-600">
                      {app.prompt}
                    </p>
                    <p className="mt-2 text-[11px] font-medium text-slate-700 opacity-0 transition group-hover:opacity-100">
                      Use this prompt
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <AppFooter />
    </main>
  );
}
