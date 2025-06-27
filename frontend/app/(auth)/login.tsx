// app/(auth)/login.tsx
import React, { useState } from "react";
import { View, Text, Button, StyleSheet, TextInput, Alert } from "react-native";
import useAuthStore from "../src/store/useUserStore";
import { useRouter } from "expo-router"; 
import { useMutation } from "@tanstack/react-query";

interface LoginData {
  email: string;
  password: string;
}

interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

const loginApiCall = async (loginData: LoginData): Promise<AuthenticatedUser> => {
  const graphqlUrl = "http://localhost:8000/graphql"; 

  const query = `
    mutation Login($input: LoginInput!) {
      login(input: $input) {
        id      # Request user ID
        email   # Request user email
        name    # Request user name
      }
    }
  `;

  const response = await fetch(graphqlUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: query,
      variables: { input: loginData },
    }),
  });

  const result = await response.json();

  if (result.errors) {
    console.error('GraphQL Login Error:', result.errors);
    throw new Error(result.errors[0]?.message || 'An unknown GraphQL error occurred during login.');
  }
  if (!result.data || !result.data.login) {
    console.error('Login Failed: No data or login field in response', result);
    throw new Error('Login failed: Invalid data structure from GraphQL server.');
  }

  // Return the user object directly
  return result.data.login;
};

export default function LoginScreen() {
  const { signIn } = useAuthStore(); 
  const router = useRouter(); 

  const [data, setData] = useState<LoginData>({
    email: "",
    password: "",
  });

  const loginMutation = useMutation<AuthenticatedUser, Error, LoginData>({ 
    mutationFn: loginApiCall,
    onSuccess: (user) => {
      console.log("Login successful:", user);
      Alert.alert("Login Success", `Welcome, ${user.name || user.email}!`);
      signIn(user);
      router.replace("/(app)/events"); 
    },
    onError: (error) => {
      console.error("Login error:", error);
      Alert.alert("Login Error", error.message || "An unknown error occurred.");
    }
  })

  const handleInputChange = (name: keyof LoginData) => (value: string) => {
    setData({
      ...data,
      [name]: value,
    });
  };

  const handleLogin = () => {
    if (!data.email || !data.password) {
      Alert.alert("Validation Error", "Please fill in both fields.");
      return;
    }

    loginMutation.mutate(data);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <Text style={styles.subtitle}>Sign in to access protected content</Text>
      <View>
        <TextInput
          style={styles.input}
          onChangeText={handleInputChange("email")}
          value={data.email}
          placeholder="Enter your email"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          value={data.password}
          placeholder="Enter your password"
          onChangeText={handleInputChange("password")}
          style={styles.input}
          placeholderTextColor="#999"
          secureTextEntry
        />
      </View>
      <View style={{ gap: 5 }}>
        <Button
          title={loginMutation.isPending ? "Logging In..." : "Sign In"}
          onPress={handleLogin}
          disabled={loginMutation.isPending}
        />
        <Button title="Sign In (as Guest)" onPress={() => signIn({ id: "guest_id", email: "guest@example.com", name: "Guest" })} />
      </View>
      <Text style={styles.switchText}>
        Don't have an account?{" "}
        <Text
          style={styles.linkText}
          onPress={() => router.navigate("/(auth)/signup")}
        >
          Sign Up
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  input: {
    height: 50,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 15,
    color: "#000",
    backgroundColor: "#f9f9f9",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  subtitle: {
    fontSize: 18,
    color: "#666",
    marginBottom: 30,
    textAlign: "center",
  },
  switchText: {
    marginTop: 20,
    fontSize: 16,
    textAlign: "center",
    color: "#555",
  },
  linkText: {
    color: "#009579",
    fontWeight: "600",
  },
});
