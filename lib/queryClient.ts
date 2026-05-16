"use client";
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10, // 10분 (서버 캐시 주기와 동기화)
      retry: 2,
    },
  },
});
