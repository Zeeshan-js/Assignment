// app/_layout.tsx
import { Stack, useSegments, router, Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import useAuthStore from './src/store/useUserStore'; // Import your Zustand store
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // Import TanStack Query components


const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isAuthenticated } = useAuthStore();
  const segments = useSegments(); 
  const [isReady, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []); 
  const inAuthGroup = segments[0] === '(auth)';

  useEffect(() => {
    if (!isReady) {
      return;
    }
    if (isAuthenticated && inAuthGroup) {
      router.replace('/(app)/events'); 
    }
    else if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login'); 
    }
  }, [isAuthenticated, inAuthGroup, segments, isReady]); 

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#009579" />
        <Text style={styles.loadingText}>Loading application...</Text>
      </View>
    );
  }

  return (
    <Stack>
  
      <Stack.Screen name="(auth)" options={{ headerShown: false, animation: 'fade' }} />

      <Stack.Screen name="(app)" options={{ headerShown: false, animation: 'fade' }} />

      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutNav />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 18,
    color: '#555',
  },
});
