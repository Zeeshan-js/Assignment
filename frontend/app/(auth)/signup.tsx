// app/(auth)/signup.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import useAuthStore from '../src/store/useUserStore';
import { useMutation } from '@tanstack/react-query';

interface SignupData {
  email: string;
  password: string;
  name: string;
}

const signupApiCall = async (signupData: SignupData): Promise<{ message: string }> => {
  const backendGraphQLUrl = 'http://localhost:8000/graphql';

  const query = `
    mutation Signup($input: SignupInput!) {
      signup(input: $input) {
        id
        email
        name
        # Add other fields you might want to receive back, e.g.,
        # createdAt
      }
    }
  `;

  const response = await fetch(backendGraphQLUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: query,
      variables: { input: signupData },
    })
  });

  const result = await response.json();

  console.log(result)

  if (result.errors) {
    console.error('GraphQL Signup Error:', result.errors);
    throw new Error(result.errors[0]?.message || 'An unknown GraphQL error occurred.');
  }

  if (!result.data || !result.data.signup) {
    console.error('Signup failed: Expected data.signup field missing from GraphQL response.', result);
    throw new Error('Signup failed: Invalid data structure from GraphQL server.');
  }

  console.log('Signup successful on backend for:', result.data.signup.email);
  return { message: 'User registered successfully!' };
};


const SignupScreen: React.FC = () => {
    const [data, setData] = useState<SignupData>({
        email: '',
        password: '',
        name: ''
    });

    const { signIn } = useAuthStore();
    const router = useRouter();

    const signupMutation = useMutation({
        mutationFn: signupApiCall,
        onSuccess: (responseData) => {
            console.log('Signup success:', responseData.message);
            Alert.alert('Signup Success', responseData.message);
            router.navigate("/(auth)/login")
        },
        onError: (error: Error) => {
            console.error('Signup error:', error.message);
            Alert.alert('Signup Failed', error.message || 'Something went wrong. Please try again.');
        },
    });

    const handleInputChange = (name: keyof SignupData) => (value: string) => {
        setData({
            ...data,
            [name]: value
        });
    };

    const handleSignup = () => {
        if (!data.email || !data.password || !data.name) {
            Alert.alert('Input Error', 'Please fill in all fields.');
            return;
        }
        signupMutation.mutate(data);
    };


    return (
        <View style={styles.container}>
            <View style={styles.formContainer}>
                <Text style={styles.header}>Signup</Text>

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
                    style={styles.input}
                    onChangeText={handleInputChange("password")}
                    value={data.password}
                    placeholder="Create a password"
                    placeholderTextColor="#999"
                    secureTextEntry
                />
                <TextInput
                    style={styles.input}
                    onChangeText={handleInputChange("name")}
                    value={data.name}
                    placeholder="Enter your name"
                    placeholderTextColor="#999"
                />

                <TouchableOpacity
                    onPress={handleSignup}
                    style={[styles.button, signupMutation.isPending && styles.buttonDisabled]}
                    disabled={signupMutation.isPending}
                >
                    {signupMutation.isPending ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Signup</Text>
                    )}
                </TouchableOpacity>

                {signupMutation.isError && (
                    <Text style={styles.errorMessage}>
                        {signupMutation.error?.message || 'An unknown error occurred.'}
                    </Text>
                )}

                <Text style={styles.switchText}>
                    Already have an account?{' '}
                    <Text style={styles.linkText} onPress={() => router.navigate('/(auth)/login')}>
                        Login
                    </Text>
                </Text>
            </View>
        </View>
    );
};

export default SignupScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#009579',
    },
    formContainer: {
        width: '85%',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    header: {
        fontSize: 28,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 20,
        color: '#333',
    },
    input: {
        height: 50,
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 15,
        fontSize: 16,
        marginBottom: 15,
        color: '#000',
        backgroundColor: '#f9f9f9',
    },
    button: {
        backgroundColor: '#009579',
        paddingVertical: 15,
        borderRadius: 6,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonDisabled: {
        backgroundColor: '#a0a0a0',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    switchText: {
        marginTop: 20,
        fontSize: 16,
        textAlign: 'center',
        color: '#555',
    },
    linkText: {
        color: '#009579',
        fontWeight: '600',
    },
    errorMessage: {
        color: 'red',
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 10,
        fontSize: 14,
    }
});