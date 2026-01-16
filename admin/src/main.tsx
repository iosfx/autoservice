import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import { APIError } from './api/client';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Don't retry on auth errors or client errors
        if (error instanceof APIError) {
          if (error.status === 401 || error.status === 403 || error.status === 404) {
            return false;
          }
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      staleTime: 10000, // 10 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes (was cacheTime)
      // Keep previous data while fetching new data (prevents blank screens)
      placeholderData: (previousData: unknown) => previousData,
    },
    mutations: {
      retry: false, // Don't retry mutations
      onError: (error) => {
        console.error('[Mutation Error]', error);
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
