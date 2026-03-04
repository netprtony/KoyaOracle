/**
 * TraitorSelectModal – Night-1 wolf-team vote to choose the Kẻ Phản Bội (Traitor).
 *
 * Shown ONCE after the wolf pack wakes on Night 1 when "ke_phan_boi" is in the
 * scenario. Wolves vote by consensus; the GM taps the selected player's shoulder
 * privately. The selected player knows who the wolves are; the wolves do NOT know
 * who the Traitor is.
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

interface TraitorSelectModalProps {
    visible: boolean;
    onClose: () => void;
    /** Called when GM confirms the traitor selection */
    onConfirm: (playerId: string) => void;
    /** Skip traitor selection (e.g. wolves couldn't agree) */
    onSkip: () => void;
    players: Player[];
    availableRoles: Role[];
    /** Role IDs of werewolf-team players – they cannot be chosen as Traitor */
    wolfPlayerIds: string[];
}

export function TraitorSelectModal({
    visible,
    onClose,
    onConfirm,
    onSkip,
    players,
    availableRoles,
    wolfPlayerIds,
}: TraitorSelectModalProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const eligiblePlayers = useMemo(
        () => players.filter(p => p.isAlive && !wolfPlayerIds.includes(p.id)),
        [players, wolfPlayerIds]
    );

    const getRole = (roleId: string | null): Role | undefined =>
        availableRoles.find(r => r.id === roleId);

    const handleConfirm = useCallback(() => {
        if (!selectedId) {
            Alert.alert('Lỗi', 'Vui lòng chọn một người chơi để trở thành Kẻ Phản Bội.');
            return;
        }
        const player = eligiblePlayers.find(p => p.id === selectedId);
        if (!player) return;

        Alert.alert(
            '🎭 Xác nhận Kẻ Phản Bội',
            `Chỉ định ${player.name} làm Kẻ Phản Bội?\n\n` +
            `• Chạm nhẹ vào vai ${player.name} khi bầy Sói nhắm mắt.\n` +
            `• ${player.name} mở mắt nhìn bầy Sói rồi nhắm lại.\n\n` +
            `⚠️ Đây là thông tin chỉ Quản Trò biết.`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xác nhận',
                    onPress: () => {
                        onConfirm(selectedId);
                        setSelectedId(null);
                        onClose();
                    },
                },
            ]
        );
    }, [selectedId, eligiblePlayers, onConfirm, onClose]);

    const handleSkip = useCallback(() => {
        Alert.alert(
            'Bỏ qua?',
            'Bầy Sói không chọn được Kẻ Phản Bội đêm nay. Bỏ qua bước này?',
            [
                { text: 'Không', style: 'cancel' },
                {
                    text: 'Bỏ qua',
                    onPress: () => {
                        setSelectedId(null);
                        onSkip();
                        onClose();
                    },
                },
            ]
        );
    }, [onSkip, onClose]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={() => {}}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.titleEmoji}>🎭</Text>
                        <Text style={styles.title}>Chọn Kẻ Phản Bội</Text>
                    </View>

                    <Text style={styles.subtitle}>
                        Bầy Sói biểu quyết chỉ định 1 người làng trở thành Kẻ Phản Bội.{'\n'}
                        Kẻ Phản Bội sẽ biết bầy Sói, nhưng bầy Sói không biết ai là Kẻ Phản Bội.
                    </Text>

                    {/* GM Note box */}
                    <View style={styles.noteBox}>
                        <Text style={styles.noteText}>
                            📋 Hướng dẫn QT: Sau khi Sói thống nhất, chạm nhẹ vào vai người được chọn.
                            Họ mở mắt nhìn bầy Sói rồi nhắm lại.
                        </Text>
                    </View>

                    {/* Player list */}
                    <ScrollView style={styles.playerList} showsVerticalScrollIndicator={false}>
                        {eligiblePlayers.map(player => {
                            const role = getRole(player.roleId);
                            const isSelected = selectedId === player.id;
                            return (
                                <TouchableOpacity
                                    key={player.id}
                                    style={[styles.playerRow, isSelected && styles.playerRowSelected]}
                                    onPress={() => setSelectedId(prev => prev === player.id ? null : player.id)}
                                    activeOpacity={0.75}
                                >
                                    <View style={[styles.colorDot, { backgroundColor: player.color }]} />
                                    <View style={styles.playerInfo}>
                                        <Text style={styles.playerName}>{player.name}</Text>
                                        {role && (
                                            <Text style={styles.playerRole}>
                                                {role.iconEmoji} {role.name}
                                            </Text>
                                        )}
                                    </View>
                                    <View style={[styles.radio, isSelected && styles.radioSelected]}>
                                        {isSelected && <View style={styles.radioInner} />}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Action buttons */}
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                            <Text style={styles.skipBtnText}>Bỏ qua</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.confirmBtn, !selectedId && styles.confirmBtnDisabled]}
                            onPress={handleConfirm}
                            disabled={!selectedId}
                        >
                            <Text style={styles.confirmBtnText}>Xác nhận 🎭</Text>
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
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#1a1a2e',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '85%',
        borderTopWidth: 2,
        borderTopColor: '#7c3aed',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 10,
    },
    titleEmoji: {
        fontSize: 28,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#c084fc',
    },
    subtitle: {
        fontSize: 14,
        color: '#a78bfa',
        lineHeight: 20,
        marginBottom: 12,
    },
    noteBox: {
        backgroundColor: '#2d1b4e',
        borderRadius: 10,
        padding: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#7c3aed',
        marginBottom: 16,
    },
    noteText: {
        fontSize: 13,
        color: '#e9d5ff',
        lineHeight: 18,
    },
    playerList: {
        maxHeight: 300,
        marginBottom: 16,
    },
    playerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2d1f3d',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    playerRowSelected: {
        borderColor: '#7c3aed',
        backgroundColor: '#3b1f5e',
    },
    colorDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        marginRight: 12,
    },
    playerInfo: {
        flex: 1,
    },
    playerName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F9FAFB',
    },
    playerRole: {
        fontSize: 13,
        color: '#9CA3AF',
        marginTop: 2,
    },
    radio: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: '#6B7280',
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioSelected: {
        borderColor: '#7c3aed',
    },
    radioInner: {
        width: 11,
        height: 11,
        borderRadius: 6,
        backgroundColor: '#7c3aed',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    skipBtn: {
        flex: 1,
        backgroundColor: '#374151',
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
    },
    skipBtnText: {
        color: '#9CA3AF',
        fontWeight: '600',
        fontSize: 15,
    },
    confirmBtn: {
        flex: 2,
        backgroundColor: '#7c3aed',
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
    },
    confirmBtnDisabled: {
        opacity: 0.4,
    },
    confirmBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
