import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ScrollView } from 'react-native';
import { 
  Text, 
  Card, 
  Avatar, 
  ActivityIndicator, 
  Searchbar,
  Chip,
  Button,
  Menu,
} from 'react-native-paper';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList, TabParamList } from '../navigation/MainNavigator';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Home'>,
  NativeStackScreenProps<MainStackParamList>
>;

type Report = {
  id: string;
  description: string;
  category: string;
  image_url: string;
  location: {
    lat: number;
    lng: number;
  };
  created_at: string;
  user_id: string;
  user: {
    username: string;
  };
};

const CATEGORIES = [
  { id: 'pollution', label: 'Pollution' },
  { id: 'deforestation', label: 'Deforestation' },
  { id: 'waste', label: 'Illegal Waste' },
  { id: 'other', label: 'Other' }
];

const HomeScreen = ({ navigation }: Props) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching all reports...');
      const { data: reportsData, error: fetchError } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching reports:', fetchError);
        throw fetchError;
      }

      // Get current user data
      const { data: { user } } = await supabase.auth.getUser();
      const currentUsername = user?.user_metadata?.username || 'Anonymous';

      // Transform reports with user data
      const reportsWithUsers = (reportsData || []).map(report => ({
        ...report,
        user: {
          username: report.user_id === user?.id ? currentUsername : 'Anonymous'
        }
      }));

      console.log('Reports fetched:', reportsWithUsers);
      setReports(reportsWithUsers);
      setFilteredReports(reportsWithUsers);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      setError('Failed to load reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterReports = () => {
    let filtered = [...reports];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(report => 
        report.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory) {
      const categoryId = CATEGORIES.find(cat => cat.label === selectedCategory)?.id;
      filtered = filtered.filter(report =>
        report.category?.toLowerCase() === categoryId?.toLowerCase()
      );
    }

    console.log('Filtered reports:', {
      total: reports.length,
      filtered: filtered.length,
      category: selectedCategory,
      search: searchQuery
    });
    
    setFilteredReports(filtered);
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('Home screen focused, refreshing reports...');
      fetchReports();
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    filterReports();
  }, [searchQuery, selectedCategory, reports]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

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
      <View style={styles.header}>
        <Searchbar
          placeholder="Search reports..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>

      <View style={styles.filterContainer}>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Button 
              mode="outlined"
              onPress={() => setMenuVisible(true)}
              icon="filter-variant"
              style={styles.categoryButton}
            >
              {selectedCategory || 'All Categories'}
            </Button>
          }
        >
          <Menu.Item
            onPress={() => {
              setSelectedCategory(null);
              setMenuVisible(false);
            }}
            title="All Categories"
          />
          {CATEGORIES.map((category) => (
            <Menu.Item
              key={category.id}
              onPress={() => {
                setSelectedCategory(category.label);
                setMenuVisible(false);
              }}
              title={category.label}
            />
          ))}
        </Menu>
      </View>

      {error ? (
        <View style={styles.centered}>
          <Text variant="bodyLarge" style={styles.error}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredReports}
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
              <Text variant="bodyLarge">No reports found</Text>
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
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBar: {
    elevation: 0,
    backgroundColor: '#f0f0f0',
  },
  filterContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryButton: {
    width: '100%',
  },
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  cardImage: {
    height: 200,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  userText: {
    marginLeft: 12,
  },
  category: {
    marginTop: 8,
    color: '#1976D2',
  },
  description: {
    marginTop: 4,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    color: '#B00020',
  },
});

export default HomeScreen; 