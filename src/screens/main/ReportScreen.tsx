import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, Platform, PermissionsAndroid } from 'react-native';
import { Button, Text, TextInput, SegmentedButtons, Surface, HelperText } from 'react-native-paper';
import { launchCamera, launchImageLibrary, MediaType, ImagePickerResponse, PhotoQuality } from 'react-native-image-picker';
import Geolocation from '@react-native-community/geolocation';
import { supabase } from '../../lib/supabase';

type Location = {
  latitude: number;
  longitude: number;
} | null;

type Report = {
  image: string | null;
  location: Location;
  category: string;
  description: string;
};

const CATEGORIES = [
  { value: 'pollution', label: 'Pollution' },
  { value: 'deforestation', label: 'Deforestation' },
  { value: 'waste', label: 'Illegal Waste' },
  { value: 'other', label: 'Other' },
];

const ReportScreen = () => {
  const [report, setReport] = useState<Report>({
    image: null,
    location: null,
    category: CATEGORIES[0].value,
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      getCurrentLocation();
    } else {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'EcoReport needs access to your location.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          getCurrentLocation();
        }
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      position => {
        setReport(prev => ({
          ...prev,
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
        }));
      },
      error => console.log(error),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 },
    );
  };

  const handleImagePicker = async (type: 'camera' | 'gallery') => {
    const options = {
      mediaType: 'photo' as MediaType,
      quality: 0.8 as PhotoQuality,
      includeBase64: true,
    };

    try {
      const result: ImagePickerResponse = type === 'camera' 
        ? await launchCamera(options)
        : await launchImageLibrary(options);

      const uri = result.assets?.[0]?.uri;
      if (uri) {
        setReport(prev => ({ ...prev, image: uri }));
      }
    } catch (err) {
      console.error(err);
      setError('Failed to capture/select image');
    }
  };

  const handleSubmit = async () => {
    if (!report.image || !report.location) {
      setError('Please provide an image and location');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get the image data
      const response = await fetch(report.image);
      const blob = await response.blob();

      // Upload image to Supabase Storage
      const timestamp = Date.now();
      const fileName = `${timestamp}.jpg`;
      const filePath = `reports/${fileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('reports')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      // Create report record in database
      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .insert([
          {
            image_url: filePath,
            location: report.location,
            category: report.category,
            description: report.description,
          },
        ])
        .select();

      if (reportError) throw reportError;

      // Reset form
      setReport({
        image: null,
        location: null,
        category: CATEGORIES[0].value,
        description: '',
      });
      
    } catch (err: any) {
      console.error('Error submitting report:', err);
      setError(err.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Surface style={styles.surface}>
        <Text variant="headlineMedium" style={styles.title}>Report an Issue</Text>

        {error && (
          <HelperText type="error" visible={true}>
            {error}
          </HelperText>
        )}

        <View style={styles.imageButtons}>
          <Button
            mode="contained"
            onPress={() => handleImagePicker('camera')}
            style={styles.button}
            icon="camera"
          >
            Take Photo
          </Button>
          <Button
            mode="outlined"
            onPress={() => handleImagePicker('gallery')}
            style={styles.button}
            icon="image"
          >
            Upload Photo
          </Button>
        </View>

        {report.image && (
          <Image source={{ uri: report.image }} style={styles.preview} />
        )}

        <SegmentedButtons
          value={report.category}
          onValueChange={value => setReport(prev => ({ ...prev, category: value }))}
          buttons={CATEGORIES}
          style={styles.categories}
        />

        <TextInput
          label="Description"
          value={report.description}
          onChangeText={text => setReport(prev => ({ ...prev, description: text }))}
          mode="outlined"
          multiline
          numberOfLines={4}
          style={styles.input}
        />

        {report.location && (
          <Text variant="bodyMedium" style={styles.location}>
            📍 Location: {report.location.latitude.toFixed(6)}, {report.location.longitude.toFixed(6)}
          </Text>
        )}

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading || !report.image || !report.location}
          style={styles.submitButton}
        >
          Submit Report
        </Button>
      </Surface>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  surface: {
    flex: 1,
    margin: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 4,
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
  },
  imageButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#e0e0e0',
  },
  categories: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  location: {
    marginBottom: 16,
    textAlign: 'center',
  },
  submitButton: {
    marginTop: 8,
  },
});

export default ReportScreen; 