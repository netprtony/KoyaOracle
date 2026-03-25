import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { WolfTheme } from '../../../styles/wolfPhaseTheme';
import { WolfMemberCard, WolfCubVoteTeaser, ConfirmButton } from '../components';
import { useGameStore } from '../../../store/gameStore';
import { useWolfPhaseUIStore } from '../../../store/wolfPhaseUIStore';

interface Screen2_PackListProps {
  isPhysicalCardMode?: boolean;
  onOpenRoleAssign?: (roleId: string) => void;
}

export function Screen2_PackList({ isPhysicalCardMode, onOpenRoleAssign }: Screen2_PackListProps) {
  const { session, availableScenarios } = useGameStore();
  const setStep = useWolfPhaseUIStore(s => s.setStep);

  if (!session) return null;

  type ListItem = ({ type: 'wolf', data: typeof wolves[0] } | { type: 'assign' } | { type: 'info' } | { type: 'punish' });

  const wolves = session.players.filter(p =>
    p.isAlive && (
      p.roleId === 'soi' ||
      p.roleId === 'soi_con' ||
      p.roleId === 'soi_don_doc' ||
      p.roleId === 'nanh_soi' ||
      p.roleId === 'soi_an_chay' ||
      p.roleId === 'soi_trum'
    )
  );

  const asleepWolfIds = wolves
    .filter(w => w.roleId === 'nanh_soi' && wolves.length > 1)
    .map(w => w.id);

  const wolfCub = wolves.find(w => w.roleId === 'soi_con');

  const scenario = availableScenarios.find(s => s.id === session.scenarioId);
  const wolfRoleIdsInScenario = scenario?.roles
    .filter(r => r.quantity > 0 && [
      'soi', 'soi_con', 'soi_don_doc', 'nanh_soi', 'soi_an_chay', 'soi_trum'
    ].includes(r.roleId))
    .map(r => r.roleId) || [];

  const unassignedWolfRoles = wolfRoleIdsInScenario.filter(roleId =>
    !wolves.some(w => w.roleId === roleId)
  );

  const handleOpenVote = () => {
    setStep(3);
  };

  const handleNext = () => {
    setStep(2);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>THÀNH VIÊN BẦY ĐANG THỨC</Text>
        <Text style={styles.title}>Danh sách bầy Sói</Text>
      </View>

      <View style={styles.listWrapper}>
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={[
            ...wolves.map(w => ({ type: 'wolf' as const, data: w })),
            ...(isPhysicalCardMode && unassignedWolfRoles.length > 0 ? [{ type: 'assign' as const }] : []),
            ...(asleepWolfIds.length > 0 ? [{ type: 'info' as const }] : []),
            ...(wolfCub ? [{ type: 'punish' as const }] : [])
          ]}
          keyExtractor={(item, idx) => {
            if (item.type === 'wolf') return item.data.id;
            return item.type + idx;
          }}
          scrollEnabled={true}
          showsVerticalScrollIndicator={true}
          scrollEventThrottle={16}
          decelerationRate="fast"
          bounces={true}
          overScrollMode="auto"
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            if (item.type === 'wolf') {
              const wolf = item.data;
              return (
                <WolfMemberCard
                  key={wolf.id}
                  player={wolf}
                  isAsleep={asleepWolfIds.includes(wolf.id)}
                  canBePunished={wolf.roleId === 'soi_con'}
                  onEditRole={isPhysicalCardMode ? () => onOpenRoleAssign?.(wolf.roleId!) : undefined}
                />
              );
            }

            if (item.type === 'assign') {
              return (
                <View style={styles.assignSection}>
                  <Text style={styles.assignTitle}>CHƯA GÁN NGƯỜI CHƠI:</Text>
                  {unassignedWolfRoles.map(roleId => (
                    <TouchableOpacity
                      key={roleId}
                      style={styles.assignBtn}
                      onPress={() => onOpenRoleAssign?.(roleId)}
                    >
                      <Text style={styles.assignBtnText}>+ GÁN {roleId.replace('_', ' ').toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              );
            }

            if (item.type === 'info') {
              return (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>💡 Nanh Sói chỉ thức dậy khi là sói cuối cùng còn sống.</Text>
                </View>
              );
            }

            return (
              <View style={styles.punishSection}>
                <View style={styles.divider} />
                <Text style={styles.punishTitle}>PHẠT SÓI CON?</Text>
                <WolfCubVoteTeaser onPress={handleOpenVote} />
              </View>
            );
          }}
        />
      </View>

      <View style={styles.footer}>
        <ConfirmButton
          title="TIẾP THEO: CHỌN MỤC TIÊU ›"
          onPress={handleNext}
          disabled={wolves.length === 0}
        />

        <TouchableOpacity style={styles.backBtn} onPress={() => setStep(0)}>
          <Text style={styles.backBtnText}>‹ QUAY LẠI MÀN HÌNH CHÀO</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: 16,
  },
  headerLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E01E1E',
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  listWrapper: {
    flex: 1,
    minHeight: 0,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 30,
  },
  emptyText: {
    fontSize: 16,
    color: '#585868',
    textAlign: 'center',
    marginTop: 40,
    fontStyle: 'italic',
  },
  assignSection: {
    marginTop: 10,
    gap: 10,
  },
  assignTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#585868',
    letterSpacing: 1,
    marginBottom: 4,
  },
  assignBtn: {
    backgroundColor: '#1A1A24',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E01E1E',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  assignBtnText: {
    color: '#E01E1E',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  infoBox: {
    backgroundColor: '#1A1A24',
    padding: 12,
    borderRadius: 10,
    marginTop: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#404050',
  },
  infoText: {
    fontSize: 14,
    color: '#A0A0B0',
    fontStyle: 'italic',
  },
  punishSection: {
    marginTop: 20,
  },
  punishTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFCC00',
    letterSpacing: 2,
    marginBottom: 10,
    textAlign: 'center',
  },
  divider: {
    borderTopWidth: 1.5,
    borderTopColor: '#242432',
    marginVertical: 20,
    width: '60%',
    alignSelf: 'center',
  },
  footer: {
    paddingTop: 16,
    borderTopWidth: 1.5,
    borderTopColor: '#242432',
    gap: 8,
  },
  backBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    color: '#585868',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});