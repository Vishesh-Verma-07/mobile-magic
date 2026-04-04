import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import { useEffect, useState } from "react";

type Prompt = {
  id: string;
  content: string;
  type: "USER" | "SYSTEM";
  createdAt: string;
};

type PromptsResponse = {
  prompts: Prompt[];
};

export function usePrompts(projectId?: string) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const { getToken } = useAuth();

  useEffect(() => {
    if (!projectId) {
      setPrompts([]);
      return;
    }

    let isMounted = true;

    const getPrompts = async () => {
      try {
        const token = await getToken();
        if (!token || !isMounted) {
          return;
        }

        const response = await axios.get<PromptsResponse>(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/projects/${projectId}/prompts`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (!isMounted) {
          return;
        }

        setPrompts(response.data.prompts ?? []);
      } catch (error) {
        console.error("Error fetching prompts:", error);
      }
    };

    void getPrompts();
    const intervalId = setInterval(() => {
      void getPrompts();
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [getToken, projectId]);

  return prompts;
}
