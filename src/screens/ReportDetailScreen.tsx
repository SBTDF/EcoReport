import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Text, Card, TextInput, Button, Avatar } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../navigation/MainNavigator';

type Comment = {
  id: string;
  text: string;
  created_at: string;
  user_id: string;
  user: {
    username: string;
  };
};

type Report = {
  id: string;
  image_url: string;
  category: string;
  description?: string;
  created_at: string;
  location: { lat: number; lng: number };
  user: {
    username: string;
  };
};

type Props = NativeStackScreenProps<MainStackParamList, 'ReportDetail'>;

const DUMMY_REPORT = {
  id: '1',
  title: 'Litter in Park',
  description: 'Found litter in Central Park',
  location: 'New York, NY',
  date: '2024-04-02',
  category: 'Litter',
  status: 'Open',
  image: 'https://example.com/image.jpg',
};

export const ReportDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { id } = route.params;
  const [report, setReport] = useState<Report | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    fetchReport();
    fetchComments();
    subscribeToComments();
  }, [id]);

  const fetchReport = async () => {
    try {
      console.log('Fetching report details for id:', id);
      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .select('*')
        .eq('id', id)
        .single();

      if (reportError) {
        console.error('Error fetching report:', reportError);
        setError('Failed to load report');
        return;
      }

      if (!reportData) {
        console.error('No report data found');
        setError('Report not found');
        return;
      }

      console.log('Report data received:', reportData);

      // Get user data from auth.users
      const { data: { user } } = await supabase.auth.getUser();
      const username = user?.user_metadata?.username || 'Unknown User';
      
      // Transform the data to match our Report type
      const transformedReport: Report = {
        id: reportData.id,
        image_url: reportData.image_url,
        category: reportData.category,
        description: reportData.description,
        created_at: reportData.created_at,
        location: reportData.location || { lat: 0, lng: 0 }, // Provide default if missing
        user: {
          username: username
        }
      };

      console.log('Transformed report:', transformedReport);
      setReport(transformedReport);
    } catch (error) {
      console.error('Error in fetchReport:', error);
      setError('Failed to load report details');
    }
  };

  const fetchComments = async () => {
    try {
      console.log('Fetching comments for report:', id);
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .eq('report_id', id)
        .order('created_at', { ascending: true });

      if (commentsError) {
        console.error('Error fetching comments:', commentsError);
        return;
      }

      // Get current user data
      const { data: { user } } = await supabase.auth.getUser();
      const currentUsername = user?.user_metadata?.username || 'Anonymous';
      
      // Map comments with user data
      const commentsWithUsers = (commentsData || []).map(comment => ({
        id: comment.id,
        text: comment.text,
        created_at: comment.created_at,
        user_id: comment.user_id,
        user: {
          username: comment.user_id === user?.id 
            ? currentUsername
            : 'Anonymous'
        }
      }));

      console.log('Processed comments:', commentsWithUsers);
      setComments(commentsWithUsers);
    } catch (error) {
      console.error('Error in fetchComments:', error);
    }
  };

  const subscribeToComments = () => {
    const subscription = supabase
      .channel('comments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `report_id=eq.${id}`,
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please sign in to comment');
        return;
      }

      const { error: insertError } = await supabase.from('comments').insert({
        report_id: id,
        text: newComment.trim(),
        user_id: user.id
      });

      if (insertError) {
        console.error('Error adding comment:', insertError);
        setError('Failed to add comment');
        return;
      }

      setNewComment('');
      fetchComments(); // Refresh comments
    } catch (error) {
      console.error('Error in handleAddComment:', error);
      setError('Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  const renderMap = () => {
    console.log('Starting renderMap function');
    console.log('Report location:', report?.location);
    console.log('Map error state:', mapError);

    if (!report?.location || mapError) {
      console.log('Returning fallback view - no location or map error');
      return (
        <View style={styles.mapContainer}>
          <Text style={styles.mapErrorText}>Location data unavailable</Text>
        </View>
      );
    }

    try {
      console.log('Attempting to render map with coordinates:', {
        lat: report.location.lat,
        lng: report.location.lng
      });
      
      if (!report.location.lat || !report.location.lng) {
        console.log('Invalid coordinates detected');
        return (
          <View style={styles.mapContainer}>
            <Text style={styles.mapErrorText}>Invalid location coordinates</Text>
          </View>
        );
      }

      console.log('Rendering location text instead of map');
      return (
        <View style={styles.mapContainer}>
          <Text style={styles.mapErrorText}>
            Location: {report.location.lat.toFixed(6)}, {report.location.lng.toFixed(6)}
          </Text>
        </View>
      );
    } catch (err) {
      console.error('Error in renderMap:', err);
      setMapError(true);
      return (
        <View style={styles.mapContainer}>
          <Text style={styles.mapErrorText}>Error loading map</Text>
        </View>
      );
    }
  };

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView}>
        <Card style={styles.card}>
          <Card.Cover source={{ uri: report.image_url }} style={styles.image} />
          <Card.Content>
            <View style={styles.userInfo}>
              <Avatar.Text 
                size={40} 
                label={report.user.username.substring(0, 2).toUpperCase()} 
              />
              <View style={styles.userText}>
                <Text variant="titleMedium">{report.user.username}</Text>
                <Text variant="bodySmall">
                  {format(new Date(report.created_at), 'MMM d, yyyy')}
                </Text>
              </View>
            </View>
            <Text variant="titleMedium" style={styles.category}>
              {report.category}
            </Text>
            {report.description && (
              <Text variant="bodyMedium" style={styles.description}>
                {report.description}
              </Text>
            )}
            {renderMap()}
          </Card.Content>
        </Card>

        <View style={styles.commentsSection}>
          <Text variant="titleLarge" style={styles.commentsTitle}>
            Comments
          </Text>
          {comments.map((comment) => (
            <Card key={comment.id} style={styles.commentCard}>
              <Card.Content>
                <View style={styles.commentHeader}>
                  <Avatar.Text 
                    size={30} 
                    label={comment.user.username.substring(0, 2).toUpperCase()} 
                  />
                  <View style={styles.commentUserInfo}>
                    <Text variant="titleSmall">{comment.user.username}</Text>
                    <Text variant="bodySmall">
                      {format(new Date(comment.created_at), 'MMM d, yyyy')}
                    </Text>
                  </View>
                </View>
                <Text variant="bodyMedium" style={styles.commentText}>
                  {comment.text}
                </Text>
              </Card.Content>
            </Card>
          ))}
        </View>
      </ScrollView>

      <Card style={styles.inputCard}>
        <Card.Content style={styles.inputContent}>
          <TextInput
            mode="outlined"
            value={newComment}
            onChangeText={setNewComment}
            placeholder="Add a comment..."
            style={styles.input}
          />
          <Button
            mode="contained"
            onPress={handleAddComment}
            loading={loading}
            disabled={loading || !newComment.trim()}
            style={styles.button}
          >
            Post
          </Button>
        </Card.Content>
      </Card>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    color: '#B00020',
    textAlign: 'center',
    margin: 16,
  },
  card: {
    margin: 8,
  },
  image: {
    height: 300,
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
    color: '#666',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  description: {
    marginBottom: 16,
  },
  mapContainer: {
    height: 200,
    marginVertical: 16,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  commentsSection: {
    padding: 8,
  },
  commentsTitle: {
    marginBottom: 8,
  },
  commentCard: {
    marginBottom: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentUserInfo: {
    marginLeft: 8,
  },
  commentText: {
    marginLeft: 38,
  },
  inputCard: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  inputContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    marginRight: 8,
  },
  button: {
    minWidth: 80,
  },
  mapErrorText: {
    color: '#666',
    textAlign: 'center',
  },
});

export default ReportDetailScreen; 