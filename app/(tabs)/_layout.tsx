import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, useWindowDimensions } from 'react-native';
import {tabBarMetrics} from '@/lib/discovery';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';

/*
 * Tablet UX: A side drawer or left-rail navigator can feel more natural than
 * bottom tabs on wide screens. We keep the standard bottom tab bar here because
 * moving primary navigation to a drawer would require re-homing each tab route,
 * duplicating headers, and re-testing deep links and auth redirects. That is
 * intentionally out of scope to avoid breaking existing navigation behavior.
 */

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
    name: 'pantry',
    title: 'Pantry',
    icon: 'basket-outline',
    activeIcon: 'basket',
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
  const {fontScale}=useWindowDimensions();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          flex: 1,
          width: '100%',
          alignSelf: 'stretch',
        },
        tabBarStyle: {
          width: '100%',
          alignSelf: 'stretch',
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          ...tabBarMetrics(insets.bottom,fontScale),
        },
        tabBarLabelPosition: 'below-icon',
        tabBarHideOnKeyboard: true,
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
            tabBarAccessibilityLabel: tab.name==='pantry'?'My Pantry':tab.title,
            tabBarLabel: ({color})=><Text numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3} style={{fontSize:11,fontWeight:'600',color,textAlign:'center',marginTop:2}}>{tab.title}</Text>,
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
