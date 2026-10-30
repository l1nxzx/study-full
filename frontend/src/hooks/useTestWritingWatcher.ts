import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as testsApi from "@/api/tests";
import { useToast } from "@/hooks/useToast";

// Tests are written in the background, which takes a minute or more. This device remembers the
// ones it started; while any is being written, the app checks on it and says when it's ready (or
// failed), wherever you are - so leaving the page never leaves you wondering.

const STORAGE_KEY = "study.tests.writing";
const CHANGE_EVENT = "study:tests-writing";

function readIds(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeIds(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Storage blocked: the test pages still show the status; only the toast is lost.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function rememberWritingTest(id: string) {
  writeIds([...new Set([...readIds(), id])]);
}

function forgetWritingTest(id: string) {
  writeIds(readIds().filter((x) => x !== id));
}

export function useTestWritingWatcher() {
  const [ids, setIds] = useState(readIds);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const announced = useRef(new Set<string>());

  useEffect(() => {
    const sync = () => setIds(readIds());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const { data } = useQuery({
    queryKey: ["tests", "writing", ids],
    queryFn: () =>
      Promise.all(
        ids.map((id) =>
          testsApi.getTest(id).catch((err) => {
            // Deleted meanwhile: stop watching it.
            if (axios.isAxiosError(err) && err.response?.status === 404) return { id, gone: true as const };
            throw err;
          })
        )
      ),
    enabled: ids.length > 0,
    refetchInterval: 4000,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!data) return;
    for (const test of data) {
      if ("gone" in test) {
        forgetWritingTest(test.id);
        continue;
      }
      // One announcement per run (a retried test is announced again).
      const run = `${test.id}:${test.generationStartedAt}`;
      if (test.status === "generating" || announced.current.has(run)) continue;
      announced.current.add(run);
      forgetWritingTest(test.id);
      queryClient.invalidateQueries({ queryKey: ["tests"] });
      // The test's own page shows the result already.
      if (pathname === `/tests/${test.id}`) continue;
      const open = { label: "Open the test", onClick: () => navigate(`/tests/${test.id}`) };
      if (test.status === "ready") {
        toast({ title: "Your test is ready", description: `${test.title} · ${test.questionCount} questions`, action: open, duration: 10000 });
      } else {
        toast({ title: "The test couldn't be written", description: test.generationError ?? undefined, variant: "destructive", action: open, duration: 10000 });
      }
    }
  }, [data, pathname, queryClient, toast, navigate]);
}
