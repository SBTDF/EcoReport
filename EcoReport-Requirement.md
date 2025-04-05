# EcoReport: Environmental Issue Reporting App  
**Tech Stack**: React Native (TypeScript), Supabase  
## Summary
EcoReport is a mobile application built with React Native (TypeScript) that enables users to report environmental issues through photos and community engagement. The key components are:

1. **Authentication System**
   - User sign up/sign in
   - Supports email/password and social login options
   - Includes profile management features

2. **Issue Reporting**
   - Photo capture via camera or gallery upload
   - Location tracking with GPS coordinates
   - Categorization of environmental issues
   - Optional descriptive text

3. **Data Storage & Management**
   - Supabase Storage for photo uploads
   - Structured database for report metadata
   - Real-time comment system
   - Secure data handling with JWT

4. **Community Features**
   - Ability to view other users' reports
   - Comment system with real-time updates
   - User profiles and engagement tracking

The app aims to create an accessible platform for environmental issue documentation and community-driven awareness through a mobile-first approach.

## 1. Core Features  
### 1.1 User Authentication  
- **Social Login**:  
  - Sign-up/Sign-in with email/password or social logins (Google, Apple).  
  - JWT token handling for secure API calls.  
  - Profile management (edit username, profile picture).  

### 1.2 Photo-Based Issue Reporting  
- **Camera/Upload Functionality**:  
  - Capture photos using device camera or upload from gallery.  
  - Add metadata:  
    - Location (GPS coordinates via `react-native-geolocation`).  
    - Issue category (e.g., pollution, deforestation).  
    - Optional description (text input).  

### 1.3 Community Sharing  
- **Supabase Storage**:  
  - Upload photos to Supabase Storage under `/reports/{user_id}/{timestamp}.jpg`.  
- **Supabase Database**:  
  - Store report data in `reports` table:  
    ```ts
    {
      id: string;
      user_id: string; // Linked to Auth0 user
      image_url: string;
      location: { lat: number; lng: number };
      category: string;
      description?: string;
      created_at: timestamp;
    }
    ```

### 1.4 Comment System  
- **Supabase Real-time Comments**:  
  - `comments` table:  
    ```ts
    {
      id: string;
      report_id: string; // Foreign key to reports.id
      user_id: string; // Auth0 user
      text: string;
      created_at: timestamp;
    }
    ```  
  - Real-time updates via Supabase subscriptions.  

---

## 2. Screens  
### 2.1 Authentication Screens  
- **Sign Up Screen**: Email/password + social auth buttons.  
- **Login Screen**: Similar to sign-up + "Forgot password" flow.  

### 2.2 Main App Screens  
- **Home Feed**:  
  - List of recent reports (image thumbnails + location).  
  - Pull-to-refresh.  
- **Report Creation**:  
  - Camera/upload UI + form fields (category, description).  
- **Report Detail**:  
  - Full-size image + metadata.  
  - Comment section (add/view comments).  

### 2.3 Profile Screen  
- User’s posted reports + account settings.  

---

## 3. Technical Requirements  
### 3.1 Libraries  
- **Navigation**: `@react-navigation/native` (Stack + Tab).  
- **Camera**: `react-native-vision-camera` or `expo-camera`.  
- **Maps**: `react-native-maps` for location tagging.  
- **State Management**: Zustand or Context API.  

### 3.2 Supabase Setup  
- **Environment Variables**:  
  ```env
  SUPABASE_URL=your_project_url
  SUPABASE_KEY=your_anon_key
  