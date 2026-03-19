import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WolfTheme } from '../../../styles/wolfPhaseTheme';
import { WolfStatusBadge } from './WolfStatusBadge';
import { Player } from '../../../types';

interface WolfMemberCardProps {
  player: Player;
  isAsleep: boolean;
  canBePunished?: boolean;
}

const getAbbr = (roleId: string | null) => {
    switch (roleId) {
      case 'soi': return 'SÓI';
      case 'soi_con': return 'SC';
      case 'soi_don_doc': return 'SĐ';
      case 'nanh_soi': return 'NS';
      case 'soi_an_chay': return 'SAC';
      case 'soi_trum': return 'STR';
      default: return 'SÓI';
    }
};

const getRoleName = (roleId: string | null) => {
    switch (roleId) {
      case 'soi': return 'Sói (Werewolf)';
      case 'soi_con': return 'Sói Con';
      case 'soi_don_doc': return 'Sói Đơn Độc';
      case 'nanh_soi': return 'Nanh Sói';
      case 'soi_an_chay': return 'Sói Ăn Chay';
      case 'soi_trum': return 'Sói Trùm';
      default: return 'Sói';
    }
};

export function WolfMemberCard({ player, isAsleep, canBePunished }: WolfMemberCardProps) {
  const isWolfCub = player.roleId === 'soi_con';
  const abbr = getAbbr(player.roleId);
  const roleName = getRoleName(player.roleId);

  const borderColor = isWolfCub ? '#242014' : WolfTheme.border.default;
  const avatarBg = isWolfCub ? WolfTheme.bg.wolfCub : '#180808';
  const avatarBorder = isWolfCub ? WolfTheme.border.wolfCub : WolfTheme.border.wolf;
  const abbrColor = isWolfCub ? WolfTheme.text.wolfCub : '#C8A8A8';

  return (
    <View style={[styles.card, { borderColor }, isAsleep && { opacity: 0.38 }]}>
      <View style={[styles.avatar, { backgroundColor: avatarBg, borderColor: avatarBorder }]}>
        <Text style={[styles.abbr, { color: abbrColor }]}>{abbr}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{player.name}</Text>
        <Text style={styles.role}>{roleName}</Text>
      </View>
      <View style={styles.badges}>
        <WolfStatusBadge 
          text={isAsleep ? 'NGỦ' : 'THỨC'} 
          type={isAsleep ? 'asleep' : 'awake'} 
        />
        {canBePunished && (
          <WolfStatusBadge text="CÓ THỂ BỊ PHẠT" type="warning" />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    paddingHorizontal: 12,
    backgroundColor: WolfTheme.bg.card,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abbr: {
    fontSize: 11,
    fontWeight: '500',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 13,
    fontWeight: '500',
    color: WolfTheme.text.primary,
  },
  role: {
    fontSize: 11,
    color: WolfTheme.text.muted,
  },
  badges: {
    alignItems: 'flex-end',
    gap: 3,
  },
});
