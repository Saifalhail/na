import React, { useState } from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';

interface ProfileAvatarProps {
  size?: 'small' | 'medium' | 'large';
  editable?: boolean;
  onImageSelect?: (imageUri: string) => void;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  size = 'medium',
  editable = false,
  onImageSelect,
}) => {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const sizeMap = {
    small: 50,
    medium: 80,
    large: 120,
  };

  const avatarSize = sizeMap[size];

  const getAvatarSource = () => {
    // Priority: uploaded avatar > social avatar > default
    if (user?.avatar) {
      return { uri: user.avatar };
    }
    
    if (user?.socialAvatarUrl) {
      return { uri: user.socialAvatarUrl };
    }
    
    // Return null for default avatar (will show initials)
    return null;
  };

  const getInitials = () => {
    if (!user) return '?';
    
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    
    return '?';
  };

  const handleImagePicker = () => {
    if (!editable) return;

    Alert.alert(
      'Change Profile Picture',
      'Choose how you would like to update your profile picture',
      [
        {
          text: 'Camera',
          onPress: () => openImagePicker('camera'),
        },
        {
          text: 'Photo Library',
          onPress: () => openImagePicker('library'),
        },
        {
          text: 'Use Social Avatar',
          onPress: () => useSocialAvatar(),
          style: user?.socialAvatarUrl ? 'default' : 'cancel',
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const openImagePicker = async (source: 'camera' | 'library') => {
    setIsLoading(true);
    
    try {
      let result;
      
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission required', 'Camera permission is required to take photos.');
          return;
        }
        
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission required', 'Photo library permission is required to select photos.');
          return;
        }
        
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        onImageSelect?.(imageUri);
        
        // Update user avatar in store
        // This would typically upload to server first
        // updateUser({ avatar: imageUri });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const useSocialAvatar = () => {
    if (user?.socialAvatarUrl) {
      onImageSelect?.(user.socialAvatarUrl);
      // updateUser({ avatar: user.socialAvatarUrl });
    }
  };

  const avatarSource = getAvatarSource();

  const containerStyle = [
    styles.container,
    {
      width: avatarSize,
      height: avatarSize,
      borderRadius: avatarSize / 2,
      backgroundColor: theme.colors.neutral[300],
    },
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={handleImagePicker}
      disabled={!editable || isLoading}
      activeOpacity={editable ? 0.7 : 1}
    >
      {avatarSource ? (
        <Image
          source={avatarSource}
          style={[
            styles.image,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
            },
          ]}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.placeholder, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
          <Text style={[styles.initials, { fontSize: avatarSize * 0.4, color: theme.colors.text }]}>
            {getInitials()}
          </Text>
        </View>
      )}
      
      {editable && (
        <View style={[styles.editOverlay, { borderRadius: avatarSize / 2 }]}>
          <Text style={styles.editText}>Edit</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    // Style applied inline
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E5E5',
  },
  initials: {
    fontWeight: '600',
  },
  editOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.8,
  },
  editText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});