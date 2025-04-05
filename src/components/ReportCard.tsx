import React from 'react';
import { StyleSheet } from 'react-native';
import { Card, Text, Avatar } from 'react-native-paper';
import type { MD3TypescaleKey } from 'react-native-paper/lib/typescript/types';
import { format } from 'date-fns';

interface Report {
  id: string;
  image_url: string;
  category: string;
  description?: string;
  created_at: string;
  user: {
    username: string;
    avatar_url?: string;
  };
}

interface ReportCardProps {
  report: Report;
  onPress?: () => void;
}

export const ReportCard: React.FC<ReportCardProps> = ({ report, onPress }) => {
  const initials = report.user.username.substring(0, 2).toUpperCase();

  return (
    <Card style={styles.card} onPress={onPress}>
      <Card.Title
        title={report.user.username}
        subtitle={format(new Date(report.created_at), 'MMM d, yyyy')}
        left={() => (
          <Avatar.Text
            label={initials}
            size={40}
          />
        )}
      />
      <Card.Content>
        <Text variant="bodyMedium" style={styles.category}>
          {report.category}
        </Text>
        {report.description && (
          <Text variant="bodyMedium" style={styles.description}>
            {report.description}
          </Text>
        )}
      </Card.Content>
      <Card.Cover source={{ uri: report.image_url }} style={styles.image} />
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 8,
    elevation: 4,
  },
  image: {
    height: 200,
    marginTop: 8,
  },
  category: {
    color: '#666',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  description: {
    marginTop: 8,
  },
}); 