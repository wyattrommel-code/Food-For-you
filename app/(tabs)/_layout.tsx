import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  name: string;
  title: string;
  icon: IoniconsName;
  activeIcon: IoniconsName;
}

const TABS: TabConfig[] = [
  {
    name: 'index',
    title: 'Home',
    icon: 'home-outline',
    activeIcon: 'home',
  },
  {
    name: 'favorites',
    title: 'Saved',
    icon: 'heart-outline',
    activeIcon: 'heart',
  },
  {
    name: 'grocery',
    title: 'Grocery',
    icon: 'cart-outline',
    activeIcon: 'cart',
  },
  {
    name: 'create',
    title: 'Create',
    icon: 'add-circle-outline',
    activeIcon: 'add-circle',
  },
  {
    name: 'settings',
    title: 'Settings',
    icon: 'settings-outline',
    activeIcon: 'settings',
  },
];

export default function TabLayout() {
  const insets        = useSafeAreaInsets();
  const { Colors }    = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 56 + insets.bottom,
          paddingBottom: Platform.OS === 'ios' ? 24 : insets.bottom + 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? tab.activeIcon : tab.icon}
                size={size}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
