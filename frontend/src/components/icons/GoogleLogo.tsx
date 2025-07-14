import React from 'react';
import { View } from 'react-native';
import Svg, { Path, G, ClipPath, Defs } from 'react-native-svg';

interface GoogleLogoProps {
  size?: number;
  style?: any;
}

export const GoogleLogo: React.FC<GoogleLogoProps> = ({ size = 24, style }) => {
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Defs>
          <ClipPath id="clip">
            <Path d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
          </ClipPath>
        </Defs>
        <G>
          {/* Blue section */}
          <Path
            fill="#4285F4"
            d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96l-3.98 3.07C3.515 21.07 7.565 24 12.255 24z"
          />
          {/* Green section */}
          <Path
            fill="#34A853"
            d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.64h-3.98c-.75 1.51-1.18 3.21-1.18 5.36s.43 3.85 1.18 5.36l3.98-3.07z"
          />
          {/* Yellow section */}
          <Path
            fill="#FBBC04"
            d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.93-10.27 6.64l3.98 3.07c.95-2.85 3.6-4.96 6.73-4.96z"
          />
          {/* Red section */}
          <Path
            fill="#EA4335"
            d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.93-10.27 6.64l3.98 3.07c.95-2.85 3.6-4.96 6.73-4.96z"
            clipPath="url(#clip)"
          />
        </G>
      </Svg>
    </View>
  );
};

export default GoogleLogo;