import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import { useEffect, useState } from "react";

type Action = {
  id: string;
  content: string;
  type: "FILE" | "SHELL";
};

export function useActions(projectId?: string) {
  const [actions, setActions] = useState<Action[]>([]);
  const { getToken } = useAuth();

  useEffect(() => {
    const fetchActions = async () => {
      if (!projectId) return;

      const token = await getToken();
      const response = await axios.get<{ actions: Action[] }>(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/projects/${projectId}/actions`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const fetchedActions = Array.isArray(response.data)
        ? response.data
        : (response.data.actions ?? []);

      setActions(fetchedActions);
    };

    const intervalId = setInterval(fetchActions, 5000); // Fetch actions every 5 seconds
    return () => clearInterval(intervalId);
  }, [projectId, getToken]);

  return actions;
}
