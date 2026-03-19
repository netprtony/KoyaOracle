import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RoleThemes } from '../../../styles/roleThemes';

interface ThemedRoleHeaderProps {
  roleId: string;
  roleName: string;
  nightNumber: number;
  instruction: string;
}

export function ThemedRoleHeader({ roleId, roleName, nightNumber, instruction }: ThemedRoleHeaderProps) {
  const theme = RoleThemes[roleId] || RoleThemes.default;

  return (
    <View style={styles.container}>
      <Text style={[styles.upperLabel, { color: theme.muted }]}>
        ĐÊM {nightNumber} · {roleName.toUpperCase()}
      </Text>
      
      <View style={styles.center}>
        <View style={[styles.iconCircle, { borderColor: theme.border, backgroundColor: theme.bg }]}>
           <Text style={{ fontSize: 24 }}>{theme.icon}</Text>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{roleName.toUpperCase()}</Text>
        <Text style={[styles.instruction, { color: theme.muted }]}>{instruction}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 20,
  },
  upperLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 18,
    alignSelf: 'flex-start',
  },
  center: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.5,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  instruction: {
    fontSize: 14,
    marginTop: 6,
    fontWeight: '500',
  },
});
