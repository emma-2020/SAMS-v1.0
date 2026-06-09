// Module augmentation: adds className prop to React Native primitives for NativeWind.
// The import establishes the module graph relationship required for augmentation to apply.
import type {} from 'react-native';

declare module 'react-native' {
  interface ViewProps {
    className?: string;
  }
  interface TextProps {
    className?: string;
  }
  interface ScrollViewProps {
    className?: string;
  }
  interface TextInputProps {
    className?: string;
  }
  interface ImageProps {
    className?: string;
  }
  interface ImageBackgroundProps {
    className?: string;
  }
  interface TouchableOpacityProps {
    className?: string;
  }
  interface PressableProps {
    className?: string;
  }
  interface FlatListProps<ItemT> {
    className?: string;
  }
}
