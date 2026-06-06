/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(auth)` | `/(auth)/login` | `/(tabs)` | `/(tabs)/` | `/(tabs)/attendance` | `/(tabs)/chat` | `/(tabs)/health` | `/(tabs)/players` | `/(tabs)/schedule` | `/(tabs)/settings` | `/..\..\next\.next\types\app\(auth)\layout` | `/..\..\next\.next\types\app\(auth)\login\page` | `/..\..\next\.next\types\app\layout` | `/..\..\next\.next\types\app\page` | `/_sitemap` | `/attendance` | `/chat` | `/health` | `/login` | `/players` | `/schedule` | `/settings`;
      DynamicRoutes: never;
      DynamicRouteTemplate: never;
    }
  }
}
