/**
 * Thin wrappers around React Native primitives that accept NativeWind className.
 * On web (Next.js) these render as <div>, <p>, etc. via react-native-web.
 * On native (Expo) they render as true View/Text/ScrollView components.
 */
import {
  View as RNView,
  Text as RNText,
  ScrollView as RNScrollView,
  Pressable as RNPressable,
  TextInput as RNTextInput,
  type ViewProps,
  type TextProps,
  type ScrollViewProps,
  type PressableProps,
  type TextInputProps,
} from 'react-native';

export { RNView as View, RNText as Text, RNScrollView as ScrollView, RNPressable as Pressable, RNTextInput as TextInput };
export type { ViewProps, TextProps, ScrollViewProps, PressableProps, TextInputProps };
