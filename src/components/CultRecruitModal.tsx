/**
 * CultRecruitModal - Modal for Cult Leader to recruit 1 player each night
 *
 * Shows alive players who are NOT yet cult members (excluding Cult Leader).
 * Displays recruited count badge. GM selects exactly 1 player → confirm.
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Alert,
} from 'react-native';
import { Player, Role } from '../types';

interface CultRecruitModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (targetId: string) => void;
    onSkip: () => void;
    players: Player[];
    cultLeaderId: string;
    cultMemberIds: string[];
    availableRoles: Role[];
}

export function CultRecruitModal({
    visible,
    onClose,
    onConfirm,
    onSkip,
    players,
    cultLeaderId,
    cultMemberIds,
    availableRoles,
}: CultRecruitModalProps) {
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

    // Eligible targets: alive, not the leader, not already a cult member
    const eligiblePlayers = players.filter(
        p => p.isAlive && p.id !== cultLeaderId && !cultMemberIds.includes(p.id)
    );

    const totalAliveNonLeader = players.filter(
        p => p.isAlive && p.id !== cultLeaderId
    ).length;

    const getRoleForPlayer = (player: Player): Role | undefined => {
        return availableRoles.find(r => r.id === player.roleId);
    };

    const handlePlayerSelect = useCallback((playerId: string) => {
        setSelectedPlayerId(prev => (prev === playerId ? null : playerId));
    }, []);

    const handleConfirm = useCallback(() => {
        if (!selectedPlayerId) {
            Alert.alert('Lỗi', 'Vui lòng chọn 1 người chơi để kết nạp');
            return;
        }

        const target = eligiblePlayers.find(p => p.id === selectedPlayerId);
        if (!target) return;

        Alert.alert(
            '🙏 Xác nhận kết nạp',
            `Kết nạp ${target.name} vào giáo phái?\n\n` +
            `Đã kết nạp: ${cultMemberIds.length}/${totalAliveNonLeader} người`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xác nhận',
                    onPress: () => {
                        onConfirm(selectedPlayerId);
                        setSelectedPlayerId(null);
                    },
                },
            ]
        );
    }, [selectedPlayerId, eligiblePlayers, cultMemberIds.length, totalAliveNonLeader, onConfirm]);

    const handleClose = useCallback(() => {
        setSelectedPlayerId(null);
        onClose();
    }, [onClose]);

    const handleSkip = useCallback(() => {
        setSelectedPlayerId(null);
        onSkip();
    }, [onSkip]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.headerIcon}>🙏</Text>
                        <Text style={styles.headerTitle}>Chủ Giáo Phái Kết Nạp</Text>
                        <Text style={styles.headerSubtitle}>
                            Chọn 1 người chơi để kết nạp vào giáo phái
                        </Text>
                    </View>

                    {/* Recruited count badge */}
                    <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>
                            📿 Đã kết nạp: {cultMemberIds.length} / {totalAliveNonLeader} người
                        </Text>
                        {eligiblePlayers.length === 0 && (
                            <Text style={styles.allRecruitedText}>
                                ✅ Tất cả đã gia nhập — kiểm tra chiến thắng!
                            </Text>
                        )}
                    </View>

                    <ScrollView style={styles.playerList} contentContainerStyle={styles.playerListContent}>
                        {eligiblePlayers.map((player) => {
                            const isSelected = selectedPlayerId === player.id;
                            const role = getRoleForPlayer(player);

                            return (
                                <TouchableOpacity
                                    key={player.id}
                                    style={[
                                        styles.playerCard,
                                        isSelected && styles.playerCardSelected,
                                    ]}
                                    onPress={() => handlePlayerSelect(player.id)}
                                >
                                    <View style={styles.playerInfo}>
                                        <View style={[styles.playerColor, { backgroundColor: player.color }]} />
                                        <View style={styles.playerDetails}>
                                            <Text style={styles.playerName}>{player.name}</Text>
                                            {role && (
                                                <Text style={styles.playerRole}>
                                                    {role.iconEmoji} {role.name}
                                                </Text>
                                            )}
                                        </View>
                                    </View>

                                    {isSelected && (
                                        <View style={styles.selectionBadge}>
                                            <Text style={styles.selectionBadgeText}>📿</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}

                        {/* Show already-recruited members (greyed out) */}
                        {cultMemberIds.length > 0 && (
                            <>
                                <Text style={styles.sectionLabel}>Đã kết nạp:</Text>
                                {cultMemberIds.map(id => {
                                    const player = players.find(p => p.id === id);
                                    if (!player) return null;
                                    const role = getRoleForPlayer(player);
                                    return (
                                        <View
                                            key={`recruited-${id}`}
                                            style={[styles.playerCard, styles.playerCardRecruited]}
                                        >
                                            <View style={styles.playerInfo}>
                                                <View style={[styles.playerColor, { backgroundColor: player.color, opacity: 0.5 }]} />
                                                <View style={styles.playerDetails}>
                                                    <Text style={[styles.playerName, { opacity: 0.5 }]}>
                                                        {player.name} {!player.isAlive ? '(đã chết)' : ''}
                                                    </Text>
                                                    {role && (
                                                        <Text style={[styles.playerRole, { opacity: 0.5 }]}>
                                                            {role.iconEmoji} {role.name}
                                                        </Text>
                                                    )}
                                                </View>
                                            </View>
                                            <Text style={styles.recruitedBadge}>✓</Text>
                                        </View>
                                    );
                                })}
                            </>
                        )}
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                            <Text style={styles.skipBtnText}>Bỏ qua</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.confirmBtn,
                                !selectedPlayerId && styles.confirmBtnDisabled,
                            ]}
                            onPress={handleConfirm}
                            disabled={!selectedPlayerId}
                        >
                            <Text style={styles.confirmBtnText}>
                                📿 Kết nạp
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    container: {
        width: '100%',
        maxWidth: 500,
        maxHeight: '90%',
        backgroundColor: '#1a1a2e',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#9c27b0',
    },
    header: {
        padding: 20,
        backgroundColor: '#2d2d4d',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#9c27b0',
    },
    headerIcon: {
        fontSize: 48,
        marginBottom: 8,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#aaa',
        marginTop: 4,
    },
    countBadge: {
        padding: 12,
        backgroundColor: '#252545',
        alignItems: 'center',
    },
    countBadgeText: {
        color: '#ce93d8',
        fontSize: 15,
        fontWeight: '600',
    },
    allRecruitedText: {
        color: '#4ade80',
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 6,
    },
    playerList: {
        maxHeight: 350,
    },
    playerListContent: {
        padding: 12,
    },
    playerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        backgroundColor: '#2a2a4a',
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    playerCardSelected: {
        borderColor: '#9c27b0',
        backgroundColor: '#3a2a4d',
        shadowColor: '#9c27b0',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
    },
    playerCardRecruited: {
        opacity: 0.6,
        borderColor: '#333',
    },
    playerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    playerColor: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 12,
    },
    playerDetails: {
        flex: 1,
    },
    playerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    playerRole: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    selectionBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#9c27b0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectionBadgeText: {
        fontSize: 16,
    },
    recruitedBadge: {
        fontSize: 18,
        color: '#4ade80',
        marginRight: 8,
    },
    sectionLabel: {
        color: '#888',
        fontSize: 13,
        marginTop: 8,
        marginBottom: 6,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#333',
        backgroundColor: '#1a1a2e',
    },
    skipBtn: {
        flex: 1,
        paddingVertical: 14,
        marginRight: 8,
        borderRadius: 10,
        backgroundColor: '#333',
        alignItems: 'center',
    },
    skipBtnText: {
        color: '#fff',
        fontSize: 16,
    },
    confirmBtn: {
        flex: 2,
        paddingVertical: 14,
        marginLeft: 8,
        borderRadius: 10,
        backgroundColor: '#9c27b0',
        alignItems: 'center',
    },
    confirmBtnDisabled: {
        backgroundColor: '#555',
        opacity: 0.5,
    },
    confirmBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
