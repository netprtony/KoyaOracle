import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WolfAvatarBubble } from './WolfAvatarBubble';
import { Player } from '../../../types';

interface WolfAvatarRowProps {
  wolves: Player[];
  asleepWolfIds: string[];
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

export function WolfAvatarRow({ wolves, asleepWolfIds }: WolfAvatarRowProps) {
  return (
    <View style={styles.container}>
      {wolves.map(wolf => (
        <WolfAvatarBubble
          key={wolf.id}
          abbreviation={getAbbr(wolf.roleId)}
          playerName={wolf.name}
          isAsleep={asleepWolfIds.includes(wolf.id)}
          isWolfCub={wolf.roleId === 'soi_con'}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 6,
  },
});
