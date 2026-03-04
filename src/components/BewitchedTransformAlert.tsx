/**
 * BewitchedTransformAlert – GM-only alert shown at night start when a Bị Quyến
 * (Bewitched) player has finalized their transformation.
 *
 * Displayed when `session.transformedThisNight` is non-empty after
 * `advanceToNight()` is called. The GM must tap the player's shoulder privately
 * before the night sequence begins.
 */

import React, { useCallback } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
} from 'react-native';
import { Player } from '../types';

export interface TransformEntry {
    playerId: string;
    newTeam: 'werewolf' | 'vampire';
}

interface BewitchedTransformAlertProps {
    visible: boolean;
    onDismiss: () => void;
    transforms: TransformEntry[];
    players: Player[];
}

export function BewitchedTransformAlert({
    visible,
    onDismiss,
    transforms,
    players,
}: BewitchedTransformAlertProps) {
    const getPlayer = useCallback(
        (id: string) => players.find(p => p.id === id),
        [players]
    );

    if (transforms.length === 0) return null;

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent
            onRequestClose={onDismiss}
        >
            <View style={styles.overlay}>
                <View style={styles.card}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerEmoji}>⚠️</Text>
                        <Text style={styles.headerTitle}>Bị Quyến Biến Đổi</Text>
                    </View>

                    <Text style={styles.subtitle}>
                        Thông tin chỉ dành cho Quản Trò.{'\n'}
                        Chạm nhẹ vào vai người dưới đây trước khi đêm bắt đầu.
                    </Text>

                    <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                        {transforms.map(({ playerId, newTeam }) => {
                            const player = getPlayer(playerId);
                            const isWolf = newTeam === 'werewolf';
                            return (
                                <View
                                    key={playerId}
                                    style={[
                                        styles.transformRow,
                                        { borderLeftColor: isWolf ? '#ef4444' : '#a855f7' },
                                    ]}
                                >
                                    <View style={styles.transformLeft}>
                                        <Text style={styles.transformEmoji}>
                                            {isWolf ? '🐺' : '🧛'}
                                        </Text>
                                        <View>
                                            <Text style={styles.playerName}>
                                                {player?.name ?? playerId}
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.teamLabel,
                                                    { color: isWolf ? '#ef4444' : '#a855f7' },
                                                ]}
                                            >
                                                Bị Quyến → {isWolf ? 'Sói' : 'Ma Cà Rồng'}
                                            </Text>
                                        </View>
                                    </View>
                                    <View
                                        style={[
                                            styles.colorDot,
                                            { backgroundColor: player?.color ?? '#6B7280' },
                                        ]}
                                    />
                                </View>
                            );
                        })}
                    </ScrollView>

                    {/* Instruction box */}
                    <View style={styles.instructionBox}>
                        <Text style={styles.instructionText}>
                            📋 Hướng dẫn:{'\n'}
                            Khi tất cả mọi người nhắm mắt, chạm nhẹ vào vai người bị biến đổi.
                            Họ sẽ biết mình đã trở thành phe mới nhưng không được tiết lộ.
                        </Text>
                    </View>

                    <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss}>
                        <Text style={styles.dismissBtnText}>Đã hiểu – Bắt đầu đêm</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        width: '100%',
        maxWidth: 420,
        backgroundColor: '#1F2937',
        borderRadius: 20,
        padding: 20,
        borderWidth: 2,
        borderColor: '#f59e0b',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 10,
    },
    headerEmoji: {
        fontSize: 28,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FCD34D',
    },
    subtitle: {
        fontSize: 13,
        color: '#9CA3AF',
        lineHeight: 18,
        marginBottom: 16,
    },
    list: {
        maxHeight: 200,
        marginBottom: 12,
    },
    transformRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#111827',
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
        borderLeftWidth: 4,
    },
    transformLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    transformEmoji: {
        fontSize: 26,
    },
    playerName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F9FAFB',
    },
    teamLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: 2,
    },
    colorDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
    },
    instructionBox: {
        backgroundColor: '#2d2200',
        borderRadius: 10,
        padding: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#f59e0b',
        marginBottom: 16,
    },
    instructionText: {
        fontSize: 13,
        color: '#FDE68A',
        lineHeight: 19,
    },
    dismissBtn: {
        backgroundColor: '#374151',
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#f59e0b',
    },
    dismissBtnText: {
        color: '#FCD34D',
        fontWeight: 'bold',
        fontSize: 15,
    },
});
