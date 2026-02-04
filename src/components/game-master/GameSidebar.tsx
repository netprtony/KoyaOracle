import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { gameMasterStyles as styles } from './gameMasterStyles';
import { getPhaseDisplay } from '../../engine/phaseController';
import { MatchLogEntry } from '../../types';

interface GameSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onPause: () => void;
  onRestart: () => void;
  onEndGame: () => void;
  onOpenOrderSettings: () => void;
  onOpenSwipeEffect: () => void;
  onOpenTimerSettings: () => void;
  matchLog: MatchLogEntry[];
}

export function GameSidebar({
  isOpen,
  onClose,
  onPause,
  onRestart,
  onEndGame,
  onOpenOrderSettings,
  onOpenSwipeEffect,
  onOpenTimerSettings,
  matchLog
}: GameSidebarProps) {
  if (!isOpen) return null;

  return (
    <View style={styles.sidebarOverlay}>
       <TouchableOpacity 
          style={styles.sidebarBackdrop} 
          activeOpacity={1} 
          onPress={onClose} 
       />
       <View style={styles.sidebarContainer}>
          <View style={styles.sidebarHeader}>
             <Text style={styles.sidebarTitle}>Menu</Text>
             <TouchableOpacity onPress={onClose}>
                <Text style={styles.closeBtn}>✕</Text>
             </TouchableOpacity>
          </View>
          
           <View style={styles.sidebarMenu}>
              <TouchableOpacity style={styles.menuItem} onPress={onPause}>
                 <Text style={styles.menuItemIcon}>⏸</Text>
                 <Text style={styles.menuItemText}>Tạm hoãn</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.menuItem} onPress={onOpenOrderSettings}>
                 <Text style={styles.menuItemIcon}>⚙️</Text>
                 <Text style={styles.menuItemText}>Cài đặt thứ tự gọi</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={onOpenSwipeEffect}>
                 <Text style={styles.menuItemIcon}>✨</Text>
                 <Text style={styles.menuItemText}>Hiệu ứng vuốt</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={onOpenTimerSettings}>
                 <Text style={styles.menuItemIcon}>⏱️</Text>
                 <Text style={styles.menuItemText}>Cài đặt đồng hồ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={onRestart}>
                 <Text style={styles.menuItemIcon}>🔄</Text>
                 <Text style={styles.menuItemText}>Bắt đầu lại</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuItem, styles.menuItemDestructive]} onPress={onEndGame}>
                 <Text style={styles.menuItemIcon}>❌</Text>
                 <Text style={[styles.menuItemText, styles.textDestructive]}>Kết thúc trò chơi</Text>
              </TouchableOpacity>
           </View>

          <View style={styles.sidebarDivider} />
          
          <Text style={styles.sidebarSectionTitle}>Nhật ký trận đấu</Text>
          <ScrollView style={styles.sidebarLogBody}>
              {matchLog.slice().reverse().map(entry => (
                <View key={entry.id} style={styles.logRow}>
                  <Text style={styles.logTime}>{getPhaseDisplay(entry.phase)}</Text>
                  <Text style={styles.logMsg}>{entry.message}</Text>
                </View>
              ))}
              {matchLog.length === 0 && (
                <Text style={styles.emptyText}>Chưa có ghi chép nào.</Text>
              )}
          </ScrollView>
       </View>
    </View>
  );
}
