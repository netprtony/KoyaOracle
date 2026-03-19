import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WolfTheme } from '../../../styles/wolfPhaseTheme';

interface WolfCubVoteTeaserProps {
  onPress: () => void;
}

export function WolfCubVoteTeaser({ onPress }: WolfCubVoteTeaserProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trừng phạt Sói Con?</Text>
      <Text style={styles.subtitle}>Cần 100% đồng ý, kể cả Sói Con tự đồng ý</Text>
      <TouchableOpacity onPress={onPress}>
        <Text style={styles.link}>Mở màn hình biểu quyết ›</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: WolfTheme.bg.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: WolfTheme.border.default,
    padding: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  title: {
    fontSize: 12,
    color: WolfTheme.text.amber,
    fontWeight: '500',
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 11,
    color: WolfTheme.text.muted,
    marginBottom: 7,
  },
  link: {
    fontSize: 11,
    color: WolfTheme.accent.wolf,
  },
});
