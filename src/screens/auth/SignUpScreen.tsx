import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

const MIN_PASSWORD_LENGTH = 8;
const MIN_USERNAME_LENGTH = 3;

const SignUpScreen = ({ navigation }: Props) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signUp } = useAuth();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= MIN_PASSWORD_LENGTH;
  };

  const validateUsername = (username: string) => {
    return username.length >= MIN_USERNAME_LENGTH;
  };

  const getErrorMessage = (err: unknown): string => {
    if (err instanceof Error) {
      if (err.message.includes('email')) {
        return 'This email is already registered. Please sign in instead.';
      }
      if (err.message.includes('password')) {
        return 'Invalid password format. Please try again.';
      }
      return err.message;
    }
    return 'An unexpected error occurred. Please try again.';
  };

  const handleSignUp = async () => {
    setError(null);

    if (!email || !password || !username) {
      setError('Please fill in all fields');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!validatePassword(password)) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
      return;
    }

    if (!validateUsername(username)) {
      setError(`Username must be at least ${MIN_USERNAME_LENGTH} characters long`);
      return;
    }

    try {
      setLoading(true);
      await signUp(email, password, username);
      // Show success message instead of immediate navigation
      setError('Account created successfully! Please check your email to verify your account.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <TextInput
        label="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        style={styles.input}
        disabled={loading}
        accessibilityLabel="Username input"
        accessibilityHint="Enter your desired username"
      />
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
        disabled={loading}
        accessibilityLabel="Email input"
        accessibilityHint="Enter your email address"
      />
      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
        disabled={loading}
        accessibilityLabel="Password input"
        accessibilityHint="Enter your password"
      />
      {error && (
        <HelperText type={error.includes('successfully') ? 'info' : 'error'} visible={true}>
          {error}
        </HelperText>
      )}
      <Button
        mode="contained"
        onPress={handleSignUp}
        loading={loading}
        style={styles.button}
        disabled={loading}
        accessibilityLabel="Sign up button"
        accessibilityHint="Press to create your account"
      >
        Sign Up
      </Button>
      <Button
        mode="text"
        onPress={() => navigation.navigate('SignIn')}
        style={styles.button}
        disabled={loading}
        accessibilityLabel="Sign in link"
        accessibilityHint="Press to go to sign in screen"
      >
        Already have an account? Sign In
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    marginBottom: 10,
  },
  button: {
    marginTop: 10,
  },
});

export default SignUpScreen; 