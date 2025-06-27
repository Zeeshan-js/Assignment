// app/(app)/index.tsx
import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { Link, router } from 'expo-router';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Home!</Text>
      <Text style={styles.subtitle}>You are signed in to the protected area.</Text>

      <Link href="/events" style={styles.linkButton}>
        <Text style={styles.linkButtonText}>Go to Events for Item 123</Text>
      </Link>

      <Button
        title="Go to Details for Item 456 (Programmatic)"
        onPress={() => router.push('/events')}
      />

      {/* Link to the Events page */}
      <Link href="/events" style={styles.linkButton}>
        <Text style={styles.linkButtonText}>Go to Events</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  linkButton: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
  },
  linkButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
