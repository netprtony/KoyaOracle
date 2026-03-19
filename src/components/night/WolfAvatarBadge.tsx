import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NIGHT_PALETTE } from '../../constants/nightPalette';

interface WolfAvatarBadgeProps {
  initials: string;
  isSleeping: boolean;
  isDone: boolean;
  roleTeam: 'wolf' | 'villager' | 'third';
  size?: number;
}

function getColor(team: WolfAvatarBadgeProps['roleTeam']) {
  if (team === 'wolf') return NIGHT_PALETTE.wolfRed;
  if (team === 'villager') return NIGHT_PALETTE.villageBlue;
  return NIGHT_PALETTE.vampurple;
}

export function WolfAvatarBadge({ initials, isSleeping, isDone, roleTeam, size = 44 }: WolfAvatarBadgeProps) {
  return (
    <View style={[styles.wrap, isSleeping && styles.sleeping]}>
      <View style={[styles.badge, { width: size, height: size, borderColor: getColor(roleTeam) }]}>
        <Text style={styles.initials}>{initials}</Text>
      </View>
      {isDone ? <Text style={styles.done}>✓</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sleeping: {
    opacity: NIGHT_PALETTE.sleepOpacity,
  },
  badge: {
    borderRadius: 999,
    borderWidth: 2,
    backgroundColor: NIGHT_PALETTE.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: NIGHT_PALETTE.text,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  done: {
    color: '#4CA98A',
    fontWeight: '700',
    marginTop: 4,
  },
});
