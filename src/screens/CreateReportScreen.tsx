import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, Platform, PermissionsAndroid, Alert, KeyboardAvoidingView, ScrollView } from 'react-native';
import { Button, Text, TextInput, SegmentedButtons, Surface, HelperText, Snackbar } from 'react-native-paper';
import { launchCamera, launchImageLibrary, CameraOptions, ImageLibraryOptions } from 'react-native-image-picker';
import Geolocation from '@react-native-community/geolocation';
import { supabase } from '../lib/supabase';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../navigation/MainNavigator';
import { decode } from 'base64-arraybuffer';

type Props = BottomTabScreenProps<TabParamList, 'CreateReport'>;

type Location = {
  latitude: number;
  longitude: number;
} | null;

type Report = {
  image: string | null;
  imageBase64: string | null;
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

export const CreateReportScreen: React.FC<Props> = ({ navigation }) => {
  const [report, setReport] = useState<Report>({
    image: null,
    imageBase64: null,
    location: null,
    category: CATEGORIES[0].value,
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Reset form when screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('CreateReport screen focused, resetting form...');
      setReport({
        image: null,
        imageBase64: null,
        location: null,
        category: CATEGORIES[0].value,
        description: '',
      });
      setError(null);
      setShowSuccess(false);
      setLoading(false);
    });

    return unsubscribe;
  }, [navigation]);

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
            message: 'EcoReport needs access to your location to tag environmental issues.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          getCurrentLocation();
        } else if (granted === PermissionsAndroid.RESULTS.DENIED) {
          setError('Location permission is required to submit reports. Please enable it in your device settings.');
        } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          setError('Location permission is required. Please enable it in your device settings.');
        }
      } catch (err) {
        console.error('Location permission error:', err);
        setError('Failed to get location permission. Please try again.');
      }
    }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      position => {
        console.log('Location obtained:', position);
        setReport(prev => ({
          ...prev,
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
        }));
      },
      error => {
        console.error('Location error:', error);
        if (error.code === 1) { // PERMISSION_DENIED
          setError('Location permission was denied. Please enable it in your device settings.');
        } else if (error.code === 2) { // POSITION_UNAVAILABLE
          setError('Location information is unavailable. Please check your device\'s location services.');
        } else if (error.code === 3) { // TIMEOUT
          setError('Location request timed out. Please try again.');
        } else {
          setError('Failed to get current location. Please try again.');
        }
      },
      { 
        enableHighAccuracy: true, 
        timeout: 15000, 
        maximumAge: 10000
      },
    );
  };

  const requestCameraPermission = async () => {
    if (Platform.OS === 'ios') {
      return true; // iOS handles permissions through Info.plist
    }
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'EcoReport needs access to your camera to take photos.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.error('Camera permission error:', err);
      return false;
    }
  };

  const handleImagePicker = async (type: 'camera' | 'gallery') => {
    console.log(`Starting ${type} image picker...`);
    try {
      // Request camera permission if needed
      if (type === 'camera') {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) {
          throw new Error('Camera permission denied');
        }
      }

      const options: CameraOptions & ImageLibraryOptions = {
        mediaType: 'photo',
        includeBase64: true,
        quality: 0.5,
        saveToPhotos: false,
      };
      console.log('Image picker options:', options);

      const result = type === 'camera' 
        ? await launchCamera(options)
        : await launchImageLibrary(options);

      console.log('Image picker result:', {
        didCancel: result.didCancel,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        assets: result.assets ? result.assets.length : 0
      });

      if (result.didCancel) {
        console.log('User cancelled image picker');
        return;
      }

      if (result.errorCode) {
        throw new Error(`Image picker error: ${result.errorMessage || result.errorCode}`);
      }

      if (result.assets?.[0]?.uri && result.assets[0].base64) {
        const asset = result.assets[0];
        console.log('Image details:', {
          uri: asset.uri,
          fileSize: asset.fileSize,
          type: asset.type,
          width: asset.width,
          height: asset.height,
          hasBase64: !!asset.base64
        });

        // Store both URI and base64 data
        setReport(prev => ({
          ...prev,
          image: asset.uri || null,
          imageBase64: asset.base64 || null
        }));
      } else {
        console.log('No image data received from picker');
        throw new Error('Failed to get image data');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error in image picker');
      console.error('Image picker error:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      setError(`Failed to capture/select image: ${error.message}`);
    }
  };

  const handleSubmit = async () => {
    console.log('Starting report submission...');
    if (!report.image || !report.imageBase64) {
      console.log('Submission failed: No image selected');
      Alert.alert('Error', 'Please select an image');
      return;
    }

    try {
      setLoading(true);
      console.log('Getting current user...');
      
      // Get current user
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !currentUser) {
        console.error('Authentication error:', userError);
        throw new Error(`User not authenticated: ${userError?.message || 'Unknown error'}`);
      }
      console.log('Current user:', { id: currentUser.id, email: currentUser.email });

      const timestamp = new Date().getTime();
      const filePath = `${currentUser.id}/${timestamp}.jpg`;
      console.log('Preparing file upload:', { filePath });

      try {
        // Convert base64 to blob using base64-arraybuffer
        const base64Data = report.imageBase64;
        console.log('Converting base64 to array buffer...');
        const arrayBuffer = decode(base64Data);
        console.log('Array buffer created, size:', arrayBuffer.byteLength);

        // Upload image to Supabase Storage
        console.log('Uploading image to Supabase Storage...');
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('reports')
          .upload(filePath, arrayBuffer, {
            contentType: 'image/jpeg'
          });

        if (uploadError) {
          console.error('Upload error details:', uploadError);
          throw new Error(`Failed to upload image: ${uploadError.message}`);
        }
        console.log('Image upload successful:', uploadData);

        // Get the public URL of the uploaded image
        console.log('Getting public URL for uploaded image...');
        const { data: urlData } = supabase.storage
          .from('reports')
          .getPublicUrl(filePath);
        
        if (!urlData?.publicUrl) {
          throw new Error('Failed to get public URL for uploaded image');
        }
        console.log('Public URL obtained:', urlData.publicUrl);

        // Create report with default location if none available
        const reportData = {
          user_id: currentUser.id,
          image_url: urlData.publicUrl,
          location: report.location ? {
            lat: report.location.latitude,
            lng: report.location.longitude
          } : { lat: 0, lng: 0 },
          category: report.category,
          description: report.description || '',
        };
        console.log('Preparing report data:', reportData);

        console.log('Inserting report into database...');
        const { data: insertData, error: insertError } = await supabase
          .from('reports')
          .insert([reportData])
          .select();

        if (insertError) {
          console.error('Database insert error:', insertError);
          throw new Error(`Failed to save report: ${insertError.message}`);
        }
        console.log('Report successfully inserted:', insertData);

        Alert.alert('Success', 'Report submitted successfully');
        navigation.goBack();
      } catch (fetchError: any) {
        console.error('Image processing error:', {
          name: fetchError.name,
          message: fetchError.message,
          stack: fetchError.stack,
          cause: fetchError.cause
        });
        throw new Error(`Failed to process image: ${fetchError.message}`);
      }
    } catch (error: any) {
      console.error('Error submitting report:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause,
        supabaseError: error.error,
        statusCode: error.statusCode
      });
      Alert.alert(
        'Error',
        `Failed to submit report: ${error.message}\n\nPlease try again or contact support if the problem persists.`
      );
    } finally {
      setLoading(false);
      console.log('Report submission process completed');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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

          {report.location ? (
            <Text variant="bodyMedium" style={styles.location}>
              📍 Location: {report.location.latitude.toFixed(6)}, {report.location.longitude.toFixed(6)}
            </Text>
          ) : (
            <Button
              mode="outlined"
              onPress={requestLocationPermission}
              style={styles.locationButton}
              icon="map-marker"
            >
              Add Location (Optional)
            </Button>
          )}

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || !report.image}
            style={styles.submitButton}
          >
            Submit Report
          </Button>
        </Surface>
      </ScrollView>
      <Snackbar
        visible={showSuccess}
        onDismiss={() => setShowSuccess(false)}
        duration={1500}
        style={styles.snackbar}
      >
        Report submitted successfully!
      </Snackbar>
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  surface: {
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
    minHeight: 100,
  },
  location: {
    marginBottom: 16,
    textAlign: 'center',
  },
  locationButton: {
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 8,
  },
  snackbar: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: '#4CAF50',
  },
}); 