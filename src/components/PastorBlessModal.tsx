/**
 * PastorBlessModal - Modal for Pastor to bless a player
 * 
 * This modal allows the Pastor (Mục Sư) to select one player to bless,
 * granting them immortality for the current night.
 * This is a one-time use ability.
 */

import React, { useState, useCallback, useMemo } from 'react';
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
import { theme } from '../styles/theme';

interface PastorBlessModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (targetId: string) => void;
    onSkip: () => void;
    players: Player[];
    pastorId: string;
    hasUsedBless: boolean;
    availableRoles: Role[];
}

export function PastorBlessModal({
    visible,
    onClose,
    onConfirm,
    onSkip,
    players,
    pastorId,
    hasUsedBless,
    availableRoles,
}: PastorBlessModalProps) {
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const alivePlayers = useMemo(() => 
        players.filter(p => p.isAlive),
        [players]
    );

    const getRoleForPlayer = (player: Player): Role | undefined => {
        return availableRoles.find(r => r.id === player.roleId);
    };

    const handlePlayerSelect = useCallback((playerId: string) => {
        setSelectedPlayerId(prev => prev === playerId ? null : playerId);
    }, []);

    const handleConfirm = useCallback(() => {
        if (!selectedPlayerId) {
            Alert.alert('Lỗi', 'Vui lòng chọn một người chơi');
            return;
        }

        const player = alivePlayers.find(p => p.id === selectedPlayerId);
        if (!player) {
            Alert.alert('Lỗi', 'Không tìm thấy người chơi');
            return;
        }

        const isSelf = selectedPlayerId === pastorId;
        const message = isSelf
            ? `Ban phước cho chính mình?\n\nBạn sẽ bất tử trong đêm nay.`
            : `Ban phước cho ${player.name}?\n\nNgười này sẽ bất tử trong đêm nay.\n\n⚠️ Đây là kỹ năng một lần duy nhất!`;

        Alert.alert(
            '✝️ Xác nhận ban phước',
            message,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xác nhận',
                    onPress: () => {
                        onConfirm(selectedPlayerId);
                        setSelectedPlayerId(null);
                        onClose();
                    },
                },
            ]
        );
    }, [selectedPlayerId, alivePlayers, pastorId, onConfirm, onClose]);

    const handleSkip = useCallback(() => {
        Alert.alert(
            '💤 Bỏ qua đêm nay?',
            'Bạn có chắc muốn bỏ qua không ban phước đêm nay?\n\nKỹ năng sẽ vẫn còn để sử dụng vào đêm sau.',
            [
                { text: 'Không', style: 'cancel' },
                {
                    text: 'Bỏ qua',
                    onPress: () => {
                        onSkip();
                        setSelectedPlayerId(null);
                        onClose();
                    },
                },
            ]
        );
    }, [onSkip, onClose]);

    const handleClose = useCallback(() => {
        setSelectedPlayerId(null);
        onClose();
    }, [onClose]);

    if (hasUsedBless) {
        return (
            <Modal
                visible={visible}
                animationType="fade"
                transparent={true}
                onRequestClose={handleClose}
            >
                <View style={styles.overlay}>
                    <View style={styles.containerUsed}>
                        <View style={styles.usedContent}>
                            <Text style={styles.usedIcon}>✝️</Text>
                            <Text style={styles.usedTitle}>Đã sử dụng Ban Phước</Text>
                            <Text style={styles.usedDescription}>
                                Mục Sư đã sử dụng kỹ năng ban phước trong ván này.
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.usedCloseBtn} onPress={handleClose}>
                            <Text style={styles.usedCloseBtnText}>Đóng</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    }

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
                        <Text style={styles.headerIcon}>✝️</Text>
                        <Text style={styles.headerTitle}>Mục Sư Ban Phước</Text>
                        <Text style={styles.headerSubtitle}>
                            Chọn 1 người để bất tử đêm nay
                        </Text>
                        <View style={styles.warningBadge}>
                            <Text style={styles.warningText}>⚠️ Một lần duy nhất</Text>
                        </View>
                    </View>



                    <ScrollView style={styles.modalBody}>
                        {alivePlayers.length === 0 ? (
                            <Text style={styles.emptyText}>Không còn người chơi sống sót.</Text>
                        ) : (
                            alivePlayers.map((player) => {
                                const isSelected = selectedPlayerId === player.id;
                                const isSelf = player.id === pastorId;
                                const role = getRoleForPlayer(player);

                                return (
                                    <TouchableOpacity
                                        key={player.id}
                                        style={[
                                            styles.playerRow,
                                            isSelected && styles.playerRowSelected,
                                            { borderLeftColor: player.color }
                                        ]}
                                        onPress={() => handlePlayerSelect(player.id)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.playerInfo}>
                                            <Text style={[styles.playerName, isSelected && styles.playerNameSelected]}>
                                                {player.name}
                                                {isSelf && ' (Bản thân)'}
                                            </Text>
                                            {role && (
                                                <Text style={styles.playerRoleText}>
                                                    {role.iconEmoji} {role.name}
                                                </Text>
                                            )}
                                        </View>
                                        <View style={[styles.checkBox, isSelected && styles.checkBoxSelected]}>
                                            {isSelected && <Text style={styles.checkMark}>✓</Text>}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </ScrollView>

                    {/* Selected Preview */}
                    {selectedPlayerId && (
                        <View style={styles.previewSection}>
                            <Text style={styles.previewLabel}>Sẽ ban phước cho:</Text>
                            {(() => {
                                const player = alivePlayers.find(p => p.id === selectedPlayerId);
                                return player ? (
                                    <View style={styles.previewPlayer}>
                                        <View style={[styles.previewColor, { backgroundColor: player.color }]} />
                                        <Text style={styles.previewName}>{player.name}</Text>
                                        <Text style={styles.previewEffect}>→ Bất tử đêm nay ✨</Text>
                                    </View>
                                ) : null;
                            })()}
                        </View>
                    )}

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                            <Text style={styles.skipBtnText}>💤 Bỏ qua</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                            <Text style={styles.cancelBtnText}>Hủy</Text>
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
                                ✝️ Ban phước
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
        borderColor: '#ffd700',
    },
    containerUsed: {
        width: '80%',
        maxWidth: 350,
        backgroundColor: '#1a1a2e',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#555',
    },
    usedContent: {
        padding: 30,
        alignItems: 'center',
    },
    usedIcon: {
        fontSize: 48,
        marginBottom: 16,
        opacity: 0.5,
    },
    usedTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#888',
        marginBottom: 8,
    },
    usedDescription: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    usedCloseBtn: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#333',
        alignItems: 'center',
    },
    usedCloseBtnText: {
        color: '#888',
        fontSize: 16,
    },
    header: {
        padding: 20,
        backgroundColor: '#2d2d4d',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#ffd700',
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
    warningBadge: {
        marginTop: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#5c4400',
        borderRadius: 20,
    },
    warningText: {
        color: '#ffd700',
        fontSize: 12,
        fontWeight: 'bold',
    },
    modalBody: {
        padding: 16,
    },
    playerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#374151',
        borderRadius: 12,
        marginBottom: 12,
        borderLeftWidth: 4,
    },
    playerRowSelected: {
        backgroundColor: '#4B5563',
        borderColor: '#fbbf24',
        borderWidth: 1,
    },
    playerInfo: {
        flex: 1,
    },
    playerName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#f3f4f6',
    },
    playerNameSelected: {
        color: '#fbbf24',
    },
    playerRoleText: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 4,
    },
    checkBox: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#4B5563',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    },
    checkBoxSelected: {
        backgroundColor: '#fbbf24',
        borderColor: '#fbbf24',
    },
    checkMark: {
        color: '#1f2937',
        fontSize: 18,
        fontWeight: 'bold',
    },
    emptyText: {
        color: '#9ca3af',
        textAlign: 'center',
        marginTop: 20,
        fontStyle: 'italic',
    },
    previewSection: {
        padding: 16,
        backgroundColor: '#1f2937',
        borderTopWidth: 1,
        borderTopColor: '#374151',
    },
    previewLabel: {
        color: '#9ca3af',
        fontSize: 14,
        marginBottom: 8,
    },
    previewPlayer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#374151',
        padding: 12,
        borderRadius: 10,
    },
    previewColor: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginRight: 10,
    },
    previewName: {
        color: '#f3f4f6',
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 8,
    },
    previewEffect: {
        color: '#fbbf24',
        fontSize: 14,
    },
    footer: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#374151',
        gap: 12,
    },
    skipBtn: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#4B5563',
        alignItems: 'center',
    },
    skipBtnText: {
        color: '#f3f4f6',
        fontWeight: 'bold',
        fontSize: 16,
    },
    cancelBtn: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#374151',
        alignItems: 'center',
    },
    cancelBtnText: {
        color: '#f3f4f6',
        fontSize: 16,
    },
    confirmBtn: {
        flex: 2,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#fbbf24',
        alignItems: 'center',
    },
    confirmBtnDisabled: {
        opacity: 0.5,
        backgroundColor: '#4B5563',
    },
    confirmBtnText: {
        color: '#1f2937',
        fontWeight: 'bold',
        fontSize: 18,
    },
});

