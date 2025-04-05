import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

// Supabase configuration
const supabaseUrl = 'https://mmvajynxxlhttpfqiudx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tdmFqeW54eGxodHRwZnFpdWR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzOTA0NjUsImV4cCI6MjA1ODk2NjQ2NX0.sG7TVic2NOKVbGHF3MhnJgiWpWhWuCLwLR6vmY846pM';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
}); 