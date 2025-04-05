import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Surface } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type ForgotPasswordScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;
};

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResetPassword = async () => {
    setLoading(true);
    try {
      // TODO: Implement Supabase password reset
      // const { error } = await supabase.auth.resetPasswordForEmail(email);
      // if (error) throw error;
      setSent(true);
    } catch (error) {
      console.error('Error resetting password:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <Surface style={styles.surface}>
        <Text variant="headlineMedium" style={styles.title}>Reset Password</Text>
        
        {!sent ? (
          <>
            <Text style={styles.description}>
              Enter your email address and we'll send you instructions to reset your password.
            </Text>
            
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
            
            <Button
              mode="contained"
              onPress={handleResetPassword}
              loading={loading}
              style={styles.button}
            >
              Send Reset Instructions
            </Button>
          </>
        ) : (
          <>
            <Text style={styles.successMessage}>
              Password reset instructions have been sent to your email address.
            </Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('SignIn')}
              style={styles.button}
            >
              Back to Sign In
            </Button>
          </>
        )}
      </Surface>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  surface: {
    flex: 1,
    padding: 20,
    margin: 16,
    borderRadius: 8,
    elevation: 4,
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
  },
  description: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
  successMessage: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#4CAF50',
  },
});

export default ForgotPasswordScreen; 