import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';

interface SectionHeaderProps {
  title:        string;
  subtitle?:    string;
  onSeeAll?:    () => void;
  accentColor?: string;
  rightAction?: React.ReactNode;
  /** Tighter vertical margins (e.g. landscape). */
  compact?:     boolean;
}

export function SectionHeader({
  title,
  subtitle,
  onSeeAll,
  accentColor,
  rightAction,
  compact,
}: SectionHeaderProps) {
  const { Colors } = useTheme();
  const {width,fontScale}=useWindowDimensions();
  const stacked=width<350 || fontScale>1.3;

  return (
    <View style={[styles.container, compact && styles.containerCompact, stacked && {flexWrap: 'wrap'}]}>
      <View style={[styles.left,stacked && {flex:undefined,width:'100%'}]}>
        {accentColor && (
          <View style={[styles.accent, { backgroundColor: accentColor }]} />
        )}
        <View style={{flex:1,minWidth:0}}>
          <Text style={[styles.title, { color: Colors.textPrimary }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
      {rightAction ?? (onSeeAll ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`See all ${title}`}
          style={{minHeight:44,flexShrink:0,justifyContent:'center'}}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSeeAll();
          }}
          hitSlop={8}
        >
          <Text style={[styles.seeAll, { color: Colors.accent }]}>See all →</Text>
        </Pressable>
      ) : null)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection:  'row',
    alignItems:     'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom:   16,
    marginTop:      32,
  },
  containerCompact: {
    marginBottom: 10,
    marginTop:    16,
  },
  left: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
    flexDirection: 'row',
    alignItems:    'center',
    gap:           10,
  },
  accent: {
    width:        4,
    height:       28,
    borderRadius: 2,
  },
  title: {
    fontSize:      22,
    fontWeight:    '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize:   13,
    fontWeight: '500',
    marginTop:  1,
  },
  seeAll: {
    fontSize:   14,
    fontWeight: '700',
  },
});
