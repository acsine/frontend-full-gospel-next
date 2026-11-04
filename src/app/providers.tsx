"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { getQueryClient } from "@/lib/query-client";
import { PageLoadingProvider } from "@/components/layout/NavigationLoader";
import { IntlProvider } from "@/intl";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <IntlProvider>
        <PageLoadingProvider>
          <ConfirmProvider>
            {children}
          </ConfirmProvider>
        </PageLoadingProvider>
      </IntlProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
