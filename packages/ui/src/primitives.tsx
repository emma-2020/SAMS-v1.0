/**
 * Thin wrappers around React Native primitives that accept NativeWind className.
 * On web (Next.js) these render as <div>, <p>, etc. via react-native-web.
 * On native (Expo) they render as true View/Text/ScrollView components.
 */
import React from 'react';
import {
  View as RNView,
  Text as RNText,
  ScrollView as RNScrollView,
  Pressable as RNPressable,
  TextInput as RNTextInput,
  type ViewProps as RNViewProps,
  type TextProps as RNTextProps,
  type ScrollViewProps as RNScrollViewProps,
  type PressableProps as RNPressableProps,
  type TextInputProps as RNTextInputProps,
} from 'react-native';

// Add className to every primitive's prop type. Module augmentation on
// react-native doesn't propagate reliably across pnpm's isolated package
// graph, so we extend the props here where the types are consumed.
export type ViewProps       = RNViewProps       & { className?: string };
export type TextProps       = RNTextProps       & { className?: string };
export type ScrollViewProps = RNScrollViewProps & { className?: string };
export type PressableProps  = RNPressableProps  & { className?: string };
export type TextInputProps  = RNTextInputProps  & { className?: string };

// Cast each component to accept the extended prop types. The runtime
// component is unchanged — only TypeScript's view of the type changes.
export const View        = RNView        as unknown as React.ComponentType<ViewProps>;
export const Text        = RNText        as unknown as React.ComponentType<TextProps>;
export const ScrollView  = RNScrollView  as unknown as React.ComponentType<ScrollViewProps>;
export const Pressable   = RNPressable   as unknown as React.ComponentType<PressableProps>;
export const TextInput   = RNTextInput   as unknown as React.ComponentType<TextInputProps>;
