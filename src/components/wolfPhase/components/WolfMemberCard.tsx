import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { WolfTheme } from '../../../styles/wolfPhaseTheme';
import { WolfStatusBadge } from './WolfStatusBadge';
import { Player } from '../../../types';

interface WolfMemberCardProps {
  player: Player;
  isAsleep: boolean;
  canBePunished?: boolean;
  onEditRole?: () => void;
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

export function WolfMemberCard({ player, isAsleep, canBePunished, onEditRole }: WolfMemberCardProps) {
  const isWolfCub = player.roleId === 'soi_con';
  const abbr = getAbbr(player.roleId);
  const roleName = getRoleName(player.roleId);

  const borderColor = isWolfCub ? '#443311' : '#2A2A3A';
  const avatarBg = isWolfCub ? WolfTheme.bg.wolfCub : '#221111';
  const avatarBorder = isWolfCub ? WolfTheme.border.wolfCub : '#E01E1E';
  const abbrColor = isWolfCub ? WolfTheme.text.wolfCub : '#FF6666';

  const Content = (
    <View style={[styles.card, { borderColor }, isAsleep && { opacity: 0.5 }]}>
      <View style={[styles.avatar, { backgroundColor: avatarBg, borderColor: avatarBorder }]}>
        <Text style={[styles.abbr, { color: abbrColor }]}>{abbr}</Text>
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{player.name}</Text>
          {onEditRole && <Text style={styles.editIcon}>✎</Text>}
        </View>
        <Text style={styles.role}>{roleName.toUpperCase()}</Text>
      </View>
      <View style={styles.badges}>
        <WolfStatusBadge 
          text={isAsleep ? 'ĐANG NGỦ' : 'ĐANG THỨC'} 
          type={isAsleep ? 'asleep' : 'awake'} 
        />
        {canBePunished && (
          <WolfStatusBadge text="CÓ THỂ PHẠT" type="warning" />
        )}
      </View>
    </View>
  );

  if (onEditRole) {
    return (
      <TouchableOpacity onPress={onEditRole} activeOpacity={0.7}>
        {Content}
      </TouchableOpacity>
    );
  }

  return Content;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    backgroundColor: '#161620',
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 10,
    elevation: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abbr: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  editIcon: {
    fontSize: 14,
    color: '#E01E1E',
  },
  role: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#888898',
    letterSpacing: 1,
  },
  badges: {
    alignItems: 'flex-end',
    gap: 6,
  },
});
