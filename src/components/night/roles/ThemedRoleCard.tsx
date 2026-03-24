import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { GameSession, Role, Player, NightAction } from '../../../types';
import { RoleThemes } from '../../../styles/roleThemes';
import { ThemedRoleHeader } from './ThemedRoleHeader';
import { useGameStore } from '../../../store/gameStore';
import { resolveNightEvents } from '../../../engine/NightResolution';

interface ThemedRoleCardProps {
  role: Role;
  session: GameSession;
  isActive: boolean;
  onShowRoleDesc: () => void;
  currentRoleIndex: number;
  totalRoles: number;
}

export function ThemedRoleCard({
  role,
  session,
  isActive,
  onShowRoleDesc,
  currentRoleIndex,
  totalRoles
}: ThemedRoleCardProps) {
  const theme = RoleThemes[role.id] || RoleThemes.default;
  const { availableRoles } = useGameStore();
  
  const currentActions = session.nightActions.filter(a => a.roleId === role.id);
  const hasActionTaken = currentActions.length > 0;

  const getInstruction = () => {
    switch (role.id) {
      case 'tien_tri': return 'Mở mắt · Soi 1 người để biết phe của họ';
      case 'bao_ve': return 'Mở mắt · Chọn 1 người để bảo vệ đêm nay';
      case 'muc_su': return 'Mở mắt · Ban phước cho 1 người (1 lần/ván)';
      case 'phu_thuy': return 'Mở mắt · Dùng bình thuốc Cứu hoặc Giết';
      case 'khan_do': return 'Mở mắt · Nhìn thấu 1 con sói trong bầy';
      case 'du_con': return 'Mở mắt · Chọn 2 mục tiêu để truy sát';
      case 'chu_giao_phai': return 'Mở mắt · Kết nạp thêm thành viên mới';
      case 'than_tinh_yeu': return 'Mở mắt · Kết nối 2 người thành đôi';
      case 'nhan_ban': return 'Mở mắt · Sao chép vai trò của 1 người';
      default: return 'Thực hiện hành động đặc biệt của vai trò';
    }
  };

  const renderTonightActionSummary = () => {
    if (!hasActionTaken) {
      return (
        <View style={styles.emptyActionBox}>
          <Text style={[styles.emptyActionText, { color: theme.muted }]}>
            Đang chờ thực hiện hành động...
          </Text>
          <Text style={[styles.emptyActionHint, { color: theme.muted }]}>
            Nhấn nút "HÀNH ĐỘNG" ở bên dưới để thiết lập.
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.summaryBox, { borderColor: theme.border, backgroundColor: theme.bg }]}>
        <Text style={[styles.summaryLabel, { color: theme.accent }]}>HÀNH ĐỘNG ĐÊM NAY</Text>
        
        {currentActions.map((action, idx) => {
          const target = session.players.find(p => p.id === action.targetPlayerId);
          const targetName = target ? target.name : 'Bỏ qua';
          
          let actionText = '';
          let resultText = null;

          switch (role.id) {
            case 'tien_tri':
              actionText = `Đã soi: ${targetName}`;
              if (target) {
                const targetRole = availableRoles.find(r => r.id === target.roleId);
                const isWolf = targetRole?.team === 'werewolf' || (target as any).isTraitor;
                resultText = (
                  <Text style={[styles.resultValue, { color: isWolf ? '#FF4D4D' : '#4ADE80' }]}>
                    KẾT QUẢ: {isWolf ? 'PHE SÓI 🐺' : 'PHE NGƯỜI 🧑'}
                  </Text>
                );
              }
              break;
            case 'bao_ve':
              actionText = `Đã bảo vệ: ${targetName}`;
              break;
            case 'muc_su':
              actionText = `Đã ban phước: ${targetName}`;
              break;
            case 'phu_thuy':
              actionText = action.actionType === 'heal' ? `Đã cứu: ${targetName}` : `Đã thuốc: ${targetName}`;
              break;
            case 'than_tinh_yeu':
              actionText = `Ghép đôi: ${targetName}`;
              break;
            case 'chu_giao_phai':
              actionText = `Đã kết nạp: ${targetName}`;
              break;
            case 'du_con':
              actionText = `Truy sát: ${targetName}`;
              break;
            case 'nhan_ban':
              actionText = `Đã sao chép: ${targetName}`;
              break;
            case 'khan_do':
              actionText = `Đã nhìn thấu: ${targetName}`;
              break;
            case 'ba_dong':
              actionText = `Đã gọi hồn: ${targetName}`;
              break;
            default:
              actionText = `Đã thực hiện kỹ năng lên: ${targetName}`;
          }

          return (
            <View key={idx} style={[styles.actionRow, idx > 0 && styles.actionRowSeparator]}>
              <Text style={[styles.summaryValue, { color: theme.text }]}>{actionText}</Text>
              {resultText}
            </View>
          );
        })}
      </View>
    );
  };

  const renderHistoricalInfo = () => {
    // History/Passive info that stays on card
    if (role.id === 'bao_ve') {
      const lastNight = session.currentPhase.number - 1;
      const lastAction = session.matchLog.find(l => 
        l.phase.number === lastNight && 
        l.metadata?.roleId === 'bao_ve'
      );
      const lastTargetId = lastAction?.metadata?.targetPlayerId;
      const lastTargetName = session.players.find(p => p.id === lastTargetId)?.name;

      if (lastTargetName) {
        return (
          <View style={[styles.specialInfoBox, { backgroundColor: theme.surface, borderColor: theme.border + '40' }]}>
            <Text style={[styles.specialInfoLabel, { color: theme.muted }]}>ĐÊM TRƯỚC ĐÃ BẢO VỆ</Text>
            <Text style={[styles.specialInfoValue, { color: theme.text }]}>
              {lastTargetName} <Text style={{ fontWeight: '400', fontSize: 13, color: theme.muted }}>· không được chọn lại</Text>
            </Text>
          </View>
        );
      }
    }

    if (role.id === 'phu_thuy') {
      const actionsExcludingWitch = session.nightActions.filter(a => a.roleId !== role.id);
      const simulation = resolveNightEvents(
          actionsExcludingWitch,
          session.players,
          availableRoles,
          session.players.filter(p => !p.isAlive).map(p => p.id),
          session.currentPhase.number,
          session.wolfInfectedRound
      );
      const dyingPlayerNames = simulation.deadPlayerIds.length > 0 
        ? session.players.filter(p => simulation.deadPlayerIds.includes(p.id)).map(p => p.name).join(', ')
        : null;

      return (
        <View style={[styles.specialInfoBox, { 
            backgroundColor: dyingPlayerNames ? '#330808' : '#0A240A', 
            borderColor: dyingPlayerNames ? '#EF4444' : '#10B981',
            borderWidth: 2 
        }]}>
          <Text style={[styles.specialInfoLabel, { color: dyingPlayerNames ? '#FCA5A5' : '#86EFAC' }]}>
            {dyingPlayerNames ? '⚠️ ĐANG HẤP HỐI' : '✓ ĐÊM NAY AN TOÀN'}
          </Text>
          <Text style={[styles.specialInfoValue, { color: dyingPlayerNames ? '#FCA5A5' : '#86EFAC' }]}>
            {dyingPlayerNames || 'Chưa có nạn nhân nào'}
          </Text>
        </View>
      );
    }

    if (role.id === 'khan_do') {
        const revealedWolves = (session as any).redRidingHoodRevealedWolves || [];
        return (
            <View style={[styles.specialInfoBox, { backgroundColor: theme.surface, borderColor: theme.border + '40' }]}>
              <Text style={[styles.specialInfoLabel, { color: theme.muted }]}>SÓI ĐÃ BIẾT ({revealedWolves.length})</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {revealedWolves.map((w: any, idx: number) => (
                    <View key={idx} style={{ backgroundColor: '#2D0808', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: '#4A1010' }}>
                        <Text style={{ fontSize: 13, color: '#FF6B6B', fontWeight: 'bold' }}>{w.name} · đã biết</Text>
                    </View>
                ))}
                {revealedWolves.length === 0 && <Text style={{ fontSize: 13, color: theme.muted }}>Chưa nhìn thấu con sói nào</Text>}
              </View>
            </View>
        );
    }

    if (role.id === 'chu_giao_phai') {
        const recruited = session.players.filter(p => p.isCultMember);
        return (
            <View style={[styles.specialInfoBox, { backgroundColor: theme.surface, borderColor: theme.border + '40' }]}>
              <Text style={[styles.specialInfoLabel, { color: theme.muted }]}>ĐÃ KẾT NẠP ({recruited.length})</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {recruited.map(p => (
                    <View key={p.id} style={{ backgroundColor: theme.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: theme.border + '40' }}>
                        <Text style={{ fontSize: 12, color: theme.text, fontWeight: 'bold' }}>{p.name}</Text>
                    </View>
                ))}
              </View>
            </View>
        );
    }

    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.headerRow}>
         <Text style={[styles.cardCount, { color: theme.muted }]}>ROLE {currentRoleIndex + 1} / {totalRoles}</Text>
         <TouchableOpacity onPress={onShowRoleDesc} style={styles.infoBtn} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
            <Text style={{ fontSize: 22 }}>ℹ️</Text>
         </TouchableOpacity>
      </View>

      <ThemedRoleHeader 
        roleId={role.id}
        roleName={role.name}
        nightNumber={session.currentPhase.number}
        instruction={getInstruction()}
      />

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={true}
        contentContainerStyle={{ paddingBottom: 60, flexGrow: 1 }}
        keyboardShouldPersistTaps="always"
        scrollEventThrottle={16}
        bounces={true}
      >
        {renderHistoricalInfo()}
        
        <View style={styles.actionContainer}>
          {renderTonightActionSummary()}
        </View>
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 18, // Reduced from 24 for more space
    borderRadius: 32,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardCount: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  infoBtn: {
    padding: 8,
  },
  content: {
    flex: 1,
    marginTop: 15,
  },
  actionContainer: {
    marginTop: 10,
  },
  emptyActionBox: {
    padding: 30,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.05)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyActionText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyActionHint: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  summaryBox: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 2,
    gap: 15,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 5,
  },
  actionRow: {
    paddingVertical: 5,
  },
  actionRowSeparator: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 12,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  resultValue: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
  },
  specialInfoBox: {
    borderWidth: 2.5,
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  specialInfoLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  specialInfoValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
    width: '100%',
    paddingBottom: 15,
  },
  doneBadge: {
    backgroundColor: '#065F46',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#10B981',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  doneBadgeText: {
    color: '#D1FAE5',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 1.5,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
  },
});

