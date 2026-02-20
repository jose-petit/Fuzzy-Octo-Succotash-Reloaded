import Head from 'next/head';
import '../styles/globals.css';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevent refetching every time the user switches tabs
      staleTime: 30000,           // Data is considered fresh for 30 seconds
      retry: 1                    // Reduce retries for faster failure feedback
    }
  }
});

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0,user-scalable=0"
        />
        <title>Transporte Óptico</title>
      </Head>

      <QueryClientProvider client={queryClient}>
        <SessionProvider session={session}>
          <Component {...pageProps} />
          <Toaster position="top-right" />
        </SessionProvider>
      </QueryClientProvider>
    </>
  );
}

export default MyApp;
