/**
 * CupidLoversModal - Modal for Cupid to select two players as lovers
 * 
 * This modal allows Cupid (Thần Tình Yêu) to select exactly 2 players
 * to become lovers on the first night.
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Pressable,
    Alert,
} from 'react-native';
import { Player, Role } from '../types';
import { theme } from '../styles/theme';

interface CupidLoversModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (target1Id: string, target2Id: string) => void;
    players: Player[];
    cupidId: string; // Cupid cannot select themselves
    availableRoles: Role[];
}

export function CupidLoversModal({
    visible,
    onClose,
    onConfirm,
    players,
    cupidId,
    availableRoles,
}: CupidLoversModalProps) {
    const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

    // Cupid CAN select themselves as one of the two lovers
    const alivePlayers = players.filter(p => p.isAlive);

    const getRoleForPlayer = (player: Player): Role | undefined => {
        return availableRoles.find(r => r.id === player.roleId);
    };

    const handlePlayerSelect = useCallback((playerId: string) => {
        setSelectedPlayers(prev => {
            if (prev.includes(playerId)) {
                // Deselect
                return prev.filter(id => id !== playerId);
            } else if (prev.length < 2) {
                // Select if less than 2 selected
                return [...prev, playerId];
            } else {
                // Replace the first selection
                return [prev[1], playerId];
            }
        });
    }, []);

    const handleConfirm = useCallback(() => {
        if (selectedPlayers.length !== 2) {
            Alert.alert('Lỗi', 'Vui lòng chọn đúng 2 người chơi');
            return;
        }

        const player1 = alivePlayers.find(p => p.id === selectedPlayers[0]);
        const player2 = alivePlayers.find(p => p.id === selectedPlayers[1]);

        if (!player1 || !player2) {
            Alert.alert('Lỗi', 'Không tìm thấy người chơi');
            return;
        }

        // Show confirmation with team info
        const role1 = getRoleForPlayer(player1);
        const role2 = getRoleForPlayer(player2);
        const team1 = role1?.team || 'unknown';
        const team2 = role2?.team || 'unknown';
        const sameTeam = team1 === team2;

        const message = sameTeam
            ? `Se duyên ${player1.name} và ${player2.name}?\n\n` +
              `💚 Họ CÙNG PHE - sẽ thắng cùng phe gốc.`
            : `Se duyên ${player1.name} và ${player2.name}?\n\n` +
              `💔 Họ KHÁC PHE - sẽ trở thành phe riêng và chỉ thắng nếu là 2 người cuối cùng!`;

        Alert.alert(
            '💘 Xác nhận se duyên',
            message,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xác nhận',
                    onPress: () => {
                        onConfirm(selectedPlayers[0], selectedPlayers[1]);
                        setSelectedPlayers([]);
                        onClose();
                    },
                },
            ]
        );
    }, [selectedPlayers, alivePlayers, onConfirm, onClose]);

    const handleClose = useCallback(() => {
        setSelectedPlayers([]);
        onClose();
    }, [onClose]);

    const getSelectionOrder = (playerId: string): number | null => {
        const index = selectedPlayers.indexOf(playerId);
        return index >= 0 ? index + 1 : null;
    };

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
                        <Text style={styles.headerIcon}>💘</Text>
                        <Text style={styles.headerTitle}>Thần Tình Yêu Se Duyên</Text>
                        <Text style={styles.headerSubtitle}>
                            Chọn 2 người chơi để trở thành Cặp Đôi
                        </Text>
                    </View>

                    <View style={styles.selectionInfo}>
                        <Text style={styles.selectionInfoText}>
                            Đã chọn: {selectedPlayers.length}/2
                        </Text>
                        {selectedPlayers.length === 2 && (
                            <Text style={styles.selectionInfoTextReady}>
                                ✓ Sẵn sàng se duyên
                            </Text>
                        )}
                    </View>

                    <ScrollView style={styles.playerList} contentContainerStyle={styles.playerListContent}>
                        {alivePlayers.map((player) => {
                            const isSelected = selectedPlayers.includes(player.id);
                            const selectionOrder = getSelectionOrder(player.id);
                            const role = getRoleForPlayer(player);

                            return (
                                <TouchableOpacity
                                    key={player.id}
                                    style={[
                                        styles.playerCard,
                                        isSelected && styles.playerCardSelected,
                                        selectionOrder === 1 && styles.playerCardFirst,
                                        selectionOrder === 2 && styles.playerCardSecond,
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
                                        <View style={[
                                            styles.selectionBadge,
                                            selectionOrder === 1 ? styles.selectionBadgeFirst : styles.selectionBadgeSecond
                                        ]}>
                                            <Text style={styles.selectionBadgeText}>
                                                {selectionOrder === 1 ? '💖' : '💖'}
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Selected Preview */}
                    {selectedPlayers.length > 0 && (
                        <View style={styles.previewSection}>
                            <Text style={styles.previewLabel}>Cặp đôi:</Text>
                            <View style={styles.previewRow}>
                                {selectedPlayers.map((id, index) => {
                                    const player = alivePlayers.find(p => p.id === id);
                                    return player ? (
                                        <React.Fragment key={id}>
                                            <View style={styles.previewPlayer}>
                                                <View style={[styles.previewColor, { backgroundColor: player.color }]} />
                                                <Text style={styles.previewName}>{player.name}</Text>
                                            </View>
                                            {index === 0 && selectedPlayers.length === 2 && (
                                                <Text style={styles.previewHeart}>💕</Text>
                                            )}
                                        </React.Fragment>
                                    ) : null;
                                })}
                            </View>
                        </View>
                    )}

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                            <Text style={styles.cancelBtnText}>Hủy</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.confirmBtn,
                                selectedPlayers.length !== 2 && styles.confirmBtnDisabled,
                            ]}
                            onPress={handleConfirm}
                            disabled={selectedPlayers.length !== 2}
                        >
                            <Text style={styles.confirmBtnText}>
                                💘 Se duyên
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
        borderColor: '#e91e63',
    },
    header: {
        padding: 20,
        backgroundColor: '#2d2d4d',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e91e63',
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
    selectionInfo: {
        padding: 12,
        backgroundColor: '#252545',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    selectionInfoText: {
        color: '#888',
        fontSize: 14,
    },
    selectionInfoTextReady: {
        color: '#4ade80',
        fontSize: 14,
        fontWeight: 'bold',
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
        borderColor: '#e91e63',
        backgroundColor: '#3a2a4a',
    },
    playerCardFirst: {
        borderColor: '#e91e63',
        shadowColor: '#e91e63',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
    },
    playerCardSecond: {
        borderColor: '#ec407a',
        shadowColor: '#ec407a',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectionBadgeFirst: {
        backgroundColor: '#e91e63',
    },
    selectionBadgeSecond: {
        backgroundColor: '#ec407a',
    },
    selectionBadgeText: {
        fontSize: 16,
    },
    previewSection: {
        padding: 16,
        backgroundColor: '#252545',
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    previewLabel: {
        color: '#888',
        fontSize: 12,
        marginBottom: 8,
    },
    previewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewPlayer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3a3a5a',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    previewColor: {
        width: 20,
        height: 20,
        borderRadius: 10,
        marginRight: 8,
    },
    previewName: {
        color: '#fff',
        fontWeight: '600',
    },
    previewHeart: {
        fontSize: 24,
        marginHorizontal: 12,
    },
    footer: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#333',
        backgroundColor: '#1a1a2e',
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 14,
        marginRight: 8,
        borderRadius: 10,
        backgroundColor: '#333',
        alignItems: 'center',
    },
    cancelBtnText: {
        color: '#fff',
        fontSize: 16,
    },
    confirmBtn: {
        flex: 2,
        paddingVertical: 14,
        marginLeft: 8,
        borderRadius: 10,
        backgroundColor: '#e91e63',
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
