import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WolfTheme } from '../../../styles/wolfPhaseTheme';

export function RevengeBanner() {
  return (
    <>
      <View style={styles.headerBar}>
        <View style={styles.dot} />
        <Text style={styles.title}>ĐÊM BÁO THÙ</Text>
      </View>

      <View style={styles.warningCard}>
        <Text style={styles.warningTitle}>Sói Con đã ngã xuống</Text>
        <Text style={styles.warningBody}>
          Bầy được phép truy sát 2 người đêm nay để báo thù
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#160000',
    borderBottomWidth: 2,
    borderBottomColor: WolfTheme.border.revenge,
    marginHorizontal: -16,
    marginTop: -20,
    padding: 11,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: WolfTheme.accent.wolf,
  },
  title: {
    fontSize: 11,
    fontWeight: '500',
    color: WolfTheme.accent.wolf,
    letterSpacing: 2,
  },
  warningCard: {
    backgroundColor: WolfTheme.bg.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#261010',
    padding: 10,
    paddingHorizontal: 12,
    marginBottom: 11,
  },
  warningTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#C08080',
    marginBottom: 3,
  },
  warningBody: {
    fontSize: 11,
    color: '#504040',
    lineHeight: 16,
  },
});
