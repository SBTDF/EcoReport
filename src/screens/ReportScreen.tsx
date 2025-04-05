import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Geolocation from '@react-native-community/geolocation';
import { supabase } from '../lib/supabase';
import { decode } from 'base64-arraybuffer';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/MainNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Report'>;

const CATEGORIES = [
  'Pollution',
  'Deforestation',
  'Waste',
  'Wildlife',
  'Water Issues',
  'Other',
];

interface StorageUploadResponse {
  data: {
    publicUrl: string;
  };
  error: Error | null;
}

export const ReportScreen: React.FC<Props> = ({ navigation }) => {
  const [image, setImage] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: "Camera Permission",
            message: "EcoReport needs access to your camera to take photos of environmental issues.",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK"
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const takePhoto = async () => {
    try {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Camera permission is required to take photos');
        return;
      }

      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: true,
      });

      if (result.didCancel) {
        Alert.alert('Cancelled', 'You cancelled taking the photo');
        return;
      }

      if (result.errorCode) {
        Alert.alert('Error', `Failed to take photo: ${result.errorMessage}`);
        return;
      }

      if (result.assets && result.assets[0]) {
        setImage(result.assets[0].base64);
        getCurrentLocation();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to access camera. Please try again.');
    }
  };

  const pickImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      includeBase64: true,
    });

    if (result.assets && result.assets[0]) {
      setImage(result.assets[0].base64);
      getCurrentLocation();
    }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      position => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      error => Alert.alert('Error', error.message),
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async () => {
    if (!image || !location || !category) {
      Alert.alert('Error', 'Please provide an image, location, and category');
      return;
    }

    setLoading(true);
    try {
      // Check if user is authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('You must be logged in to submit a report');
      }
      console.log('User is authenticated:', session.user.id);

      // Upload image to Supabase Storage
      const imagePath = `reports/${Date.now()}.jpg`;
      console.log('Processing image:', imagePath);

      try {
        if (!image) {
          throw new Error('Image data is missing');
        }

        // Upload using base64 data directly
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('reports')
          .upload(imagePath, decode(image), {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error details:', uploadError);
          throw new Error(`Failed to upload image: ${uploadError.message}`);
        }

        console.log('Upload successful:', uploadData);

        // Get the public URL
        const { data: urlData, error: urlError } = await supabase.storage
          .from('reports')
          .createSignedUrl(imagePath, 3600) as StorageUploadResponse;

        if (urlError) {
          console.error('URL error:', urlError);
          throw new Error(`Failed to get public URL: ${urlError.message}`);
        }

        const publicUrl = urlData.publicUrl;
        console.log('Public URL:', publicUrl);

        // Save report data
        const { data: insertData, error: insertError } = await supabase
          .from('reports')
          .insert({
            user_id: session.user.id,
            image_url: publicUrl,
            location: location,
            category: category,
            description: description,
          })
          .select();

        if (insertError) {
          console.error('Insert error:', insertError);
          throw new Error(`Failed to save report: ${insertError.message}`);
        }

        console.log('Report saved:', insertData);
        Alert.alert('Success', 'Report submitted successfully');
        navigation.navigate('Home');
      } catch (fetchError: any) {
        console.error('Fetch/blob error:', fetchError);
        throw new Error(`Failed to process image: ${fetchError.message}`);
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      Alert.alert(
        'Error',
        `Failed to submit report: ${error.message}\n\nPlease try again or contact support if the problem persists.`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.imageContainer}>
        {image ? (
          <Image source={{ uri: `data:image/jpeg;base64,${image}` }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Text>No image selected</Text>
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={takePhoto}>
          <Text style={styles.buttonText}>Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={pickImage}>
          <Text style={styles.buttonText}>Pick from Gallery</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.categoryContainer}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryButton,
              category === cat && styles.categoryButtonSelected,
            ]}
            onPress={() => setCategory(cat)}
          >
            <Text
              style={[
                styles.categoryButtonText,
                category === cat && styles.categoryButtonTextSelected,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Description (optional)"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
      />

      {location && (
        <Text style={styles.locationText}>
          Location: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
        </Text>
      )}

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? 'Submitting...' : 'Submit Report'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  imageContainer: {
    width: '100%',
    height: 200,
    marginBottom: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    width: '48%',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  categoryButton: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 20,
    margin: 5,
  },
  categoryButtonSelected: {
    backgroundColor: '#007AFF',
  },
  categoryButtonText: {
    color: '#333',
  },
  categoryButtonTextSelected: {
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  locationText: {
    marginBottom: 20,
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 