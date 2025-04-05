import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, Avatar, ActivityIndicator } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList, TabParamList } from '../navigation/MainNavigator';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'MyReports'>,
  NativeStackScreenProps<MainStackParamList>
>;

type Report = {
  id: string;
  image_url: string;
  category: string;
  description?: string;
  created_at: string;
  location: {
    lat: number;
    lng: number;
  };
  user_id: string;
  user: {
    username: string;
  };
};

export const MyReportsScreen: React.FC<Props> = ({ navigation }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please sign in to view your reports');
        return;
      }

      console.log('Fetching user reports...');
      const { data: reportsData, error: fetchError } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching reports:', fetchError);
        throw fetchError;
      }

      // Transform reports with user data
      const reportsWithUsers = (reportsData || []).map(report => ({
        ...report,
        user: {
          username: user.user_metadata.username || 'Anonymous'
        }
      }));

      console.log('User reports fetched:', reportsWithUsers);
      setReports(reportsWithUsers);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      setError('Failed to load reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Add focus listener to refresh reports when returning to this screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('My Reports screen focused, refreshing reports...');
      fetchReports();
    });

    return unsubscribe;
  }, [navigation]);

  const renderItem = ({ item }: { item: Report }) => (
    <Card style={styles.card} onPress={() => navigation.navigate('ReportDetail', { id: item.id })}>
      <Card.Cover source={{ uri: item.image_url }} style={styles.cardImage} />
      <Card.Content>
        <View style={styles.userInfo}>
          <Avatar.Text 
            size={40} 
            label={item.user.username.substring(0, 2).toUpperCase()} 
          />
          <View style={styles.userText}>
            <Text variant="titleMedium">{item.user.username}</Text>
            <Text variant="bodySmall">
              {format(new Date(item.created_at), 'MMM d, yyyy')}
            </Text>
          </View>
        </View>
        <Text variant="titleMedium" style={styles.category}>{item.category}</Text>
        {item.description && (
          <Text variant="bodyMedium" style={styles.description}>
            {item.description}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.centered}>
          <Text variant="bodyLarge" style={styles.error}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text variant="bodyLarge">You haven't created any reports yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 4,
  },
  cardImage: {
    height: 200,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  userText: {
    marginLeft: 12,
  },
  category: {
    color: '#2196F3',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  description: {
    marginBottom: 16,
  },
  error: {
    color: '#B00020',
  },
}); 