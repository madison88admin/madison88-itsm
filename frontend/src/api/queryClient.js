import { QueryClient } from "react-query";

// Shared cache defaults keep dashboard reads consistent and reduce duplicate polling.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15000,
      cacheTime: 300000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});
