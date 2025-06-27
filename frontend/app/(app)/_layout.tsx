// app/(app)/_layout.tsx
import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import useAuthStore from '../src/store/useUserStore'; 
import { Button } from 'react-native';

export default function AppLayout() {
  const { signOut } = useAuthStore();

  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#f4511e',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen name="events" options={{ title: 'Events' }} /> 
        <Stack.Screen name="index" options={{ title: 'Home' }} /> 
        <Stack.Screen
          name="details/[id]"
          options={({ route }) => ({
            title: `Details for ID: ${
              (route.params as { id: string })?.id || 'N/A'
            }`,
            headerRight: () => (
                <Button
                    onPress={signOut}
                    title="Sign Out"
                    color="#fff"
                />
            ),
          })}
        />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
