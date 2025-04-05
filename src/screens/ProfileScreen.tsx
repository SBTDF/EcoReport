import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Avatar } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { MainStackParamList } from '../navigation/MainNavigator';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<MainStackParamList, 'Profile'>;

const ProfileScreen = ({ navigation }: Props) => {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState({
    reports: 0,
    comments: 0,
    points: 0
  });

  const fetchUserStats = async () => {
    if (!user) return;

    try {
      // Fetch reports count
      const { count: reportsCount, error: reportsError } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (reportsError) {
        console.error('Error fetching reports count:', reportsError);
      }

      // Fetch comments count
      const { count: commentsCount, error: commentsError } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (commentsError) {
        console.error('Error fetching comments count:', commentsError);
      }

      setStats({
        reports: reportsCount || 0,
        comments: commentsCount || 0,
        points: (reportsCount || 0) * 10 + (commentsCount || 0) * 2 // Points calculation
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  useEffect(() => {
    fetchUserStats();
  }, [user]);

  // Add focus listener to refresh stats when returning to this screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchUserStats();
    });

    return unsubscribe;
  }, [navigation]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigation.navigate('SignIn');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Avatar.Text
          size={80}
          label={user?.username?.charAt(0).toUpperCase() || 'U'}
          style={styles.avatar}
        />
        <Text style={styles.username}>{user?.username}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.reports}</Text>
          <Text style={styles.statLabel}>Reports</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.comments}</Text>
          <Text style={styles.statLabel}>Comments</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.points}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
      </View>
      <Button
        mode="contained"
        onPress={handleSignOut}
        style={styles.button}
      >
        Sign Out
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    marginBottom: 16,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    color: '#666',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  button: {
    marginTop: 20,
  },
});

export default ProfileScreen; 