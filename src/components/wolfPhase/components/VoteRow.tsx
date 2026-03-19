import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { WolfTheme } from '../../../styles/wolfPhaseTheme';

interface VoteRowProps {
  name: string;
  roleName: string;
  voted: boolean;
  isWolfCub?: boolean;
  onToggle: () => void;
}

export function VoteRow({ name, roleName, voted, isWolfCub, onToggle }: VoteRowProps) {
  const thumbStyle = useAnimatedStyle(() => ({
    left: withTiming(voted ? 19 : 2, { duration: 150 }),
  }));

  return (
    <View style={[styles.container, isWolfCub && { borderColor: '#222010' }]}>
      <View style={styles.info}>
        <Text style={[styles.name, isWolfCub && { color: WolfTheme.text.wolfCub }]}>
            {name}
        </Text>
        <Text style={[styles.role, isWolfCub && { color: '#B07820' }]}>
          {roleName} {isWolfCub && '· Tự đồng ý'}
        </Text>
      </View>
      <TouchableOpacity 
        style={[styles.toggle, voted && styles.toggleOn, isWolfCub && { pointerEvents: 'none' as any }]}
        onPress={onToggle}
        activeOpacity={0.8}
      >
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    paddingHorizontal: 12,
    backgroundColor: WolfTheme.bg.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: WolfTheme.border.default,
    marginBottom: 6,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 13,
    fontWeight: '500',
    color: '#C8C0B0',
  },
  role: {
    fontSize: 11,
    color: WolfTheme.text.muted,
  },
  toggle: {
    width: 38,
    height: 21,
    backgroundColor: '#20202E',
    borderRadius: 11,
    position: 'relative',
  },
  toggleOn: {
    backgroundColor: WolfTheme.accent.wolf,
  },
  thumb: {
    width: 17,
    height: 17,
    backgroundColor: '#E0D8C8',
    borderRadius: 50,
    position: 'absolute',
    top: 2,
  },
});
