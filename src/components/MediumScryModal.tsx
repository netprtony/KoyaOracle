/**
 * MediumScryModal – Modal for Bà Đồng (Medium) to investigate a player.
 *
 * Each night the Medium picks one player; the GM reveals only
 * CORRECT (Tiên Tri found) or INCORRECT. No real role is disclosed.
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
import { MediumScryResult } from '../types';

interface MediumScryModalProps {
    visible: boolean;
    onClose: () => void;
    /** Called when GM confirms a target – triggers mediumScry in the store */
    onScry: (targetId: string) => void;
    onSkip: () => void;
    players: Player[];
    mediumId: string;
    availableRoles: Role[];
    /** Latest result from the store (set after onScry is called) */
    lastResult?: MediumScryResult | null;
    /** Clear result callback (called when modal closes after result shown) */
    onClearResult: () => void;
}

export function MediumScryModal({
    visible,
    onClose,
    onScry,
    onSkip,
    players,
    mediumId,
    availableRoles,
    lastResult,
    onClearResult,
}: MediumScryModalProps) {
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [showResult, setShowResult] = useState(false);

    const alivePlayers = useMemo(
        () => players.filter(p => p.isAlive && p.id !== mediumId),
        [players, mediumId]
    );

    const handlePlayerSelect = useCallback((playerId: string) => {
        setSelectedPlayerId(prev => (prev === playerId ? null : playerId));
    }, []);

    const handleConfirm = useCallback(() => {
        if (!selectedPlayerId) {
            Alert.alert('Lỗi', 'Vui lòng chọn một người chơi để soi.');
            return;
        }

        const player = alivePlayers.find(p => p.id === selectedPlayerId);
        if (!player) return;

        Alert.alert(
            '🔮 Xác nhận soi cầu',
            `Soi ${player.name}?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xác nhận',
                    onPress: () => {
                        onScry(selectedPlayerId);
                        setShowResult(true);
                    },
                },
            ]
        );
    }, [selectedPlayerId, alivePlayers, onScry]);

    const handleSkip = useCallback(() => {
        Alert.alert(
            '💤 Bỏ qua?',
            'Không soi đêm nay?',
            [
                { text: 'Không', style: 'cancel' },
                {
                    text: 'Bỏ qua',
                    onPress: () => {
                        setSelectedPlayerId(null);
                        onSkip();
                        onClose();
                    },
                },
            ]
        );
    }, [onSkip, onClose]);

    const handleCloseResult = useCallback(() => {
        setSelectedPlayerId(null);
        setShowResult(false);
        onClearResult();
        onClose();
    }, [onClearResult, onClose]);

    // ── Result overlay ────────────────────────────────────────────────────
    if (showResult && lastResult) {
        const targetPlayer = players.find(p => p.id === lastResult.targetId);
        const isCorrect = lastResult.isCorrect;

        return (
            <Modal
                visible={visible}
                animationType="fade"
                transparent
                onRequestClose={handleCloseResult}
            >
                <View style={styles.overlay}>
                    <View style={[styles.resultContainer, isCorrect ? styles.resultCorrect : styles.resultIncorrect]}>
                        <Text style={styles.resultEmoji}>{isCorrect ? '✅' : '❌'}</Text>
                        <Text style={styles.resultTitle}>
                            {isCorrect ? 'ĐÚNG!' : 'SAI'}
                        </Text>
                        <Text style={styles.resultDesc}>
                            {targetPlayer?.name ?? 'Người chơi'}
                            {isCorrect
                                ? '\n→ Đó là Tiên Tri! 🔮'
                                : '\n→ Không phải Tiên Tri.'}
                        </Text>
                        <Text style={styles.resultNote}>
                            (Chỉ Quản Trò biết kết quả này)
                        </Text>
                        <TouchableOpacity style={styles.closeResultBtn} onPress={handleCloseResult}>
                            <Text style={styles.closeResultBtnText}>Xác nhận</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    }

    // ── Target selection ──────────────────────────────────────────────────
    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerIcon}>🔮</Text>
                        <Text style={styles.headerTitle}>Bà Đồng Soi Cầu</Text>
                        <Text style={styles.headerSubtitle}>
                            Chọn 1 người để xác định có phải Tiên Tri không
                        </Text>
                        <View style={styles.infoBadge}>
                            <Text style={styles.infoText}>Kết quả chỉ: Đúng / Sai</Text>
                        </View>
                    </View>

                    {/* Player list */}
                    <ScrollView style={styles.body}>
                        {alivePlayers.length === 0 ? (
                            <Text style={styles.emptyText}>Không còn người chơi để soi.</Text>
                        ) : (
                            alivePlayers.map(player => {
                                const isSelected = selectedPlayerId === player.id;
                                return (
                                    <TouchableOpacity
                                        key={player.id}
                                        style={[
                                            styles.playerRow,
                                            isSelected && styles.playerRowSelected,
                                            { borderLeftColor: player.color },
                                        ]}
                                        onPress={() => handlePlayerSelect(player.id)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.playerInfo}>
                                            <Text style={[styles.playerName, isSelected && styles.playerNameSelected]}>
                                                {player.name}
                                            </Text>
                                        </View>
                                        <View style={[styles.checkBox, isSelected && styles.checkBoxSelected]}>
                                            {isSelected && <Text style={styles.checkMark}>✓</Text>}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                            <Text style={styles.skipBtnText}>💤 Bỏ qua</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelBtnText}>Hủy</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.confirmBtn, !selectedPlayerId && styles.confirmBtnDisabled]}
                            onPress={handleConfirm}
                            disabled={!selectedPlayerId}
                        >
                            <Text style={styles.confirmBtnText}>🔮 Soi cầu</Text>
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
        borderColor: '#7c3aed',
    },
    header: {
        padding: 20,
        backgroundColor: '#2d1b69',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#7c3aed',
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
        color: '#c4b5fd',
        marginTop: 4,
        textAlign: 'center',
    },
    infoBadge: {
        marginTop: 10,
        paddingHorizontal: 12,
        paddingVertical: 5,
        backgroundColor: '#4a1d96',
        borderRadius: 20,
    },
    infoText: {
        color: '#ddd6fe',
        fontSize: 12,
        fontWeight: 'bold',
    },
    body: {
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
        borderColor: '#a78bfa',
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
        color: '#a78bfa',
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
        backgroundColor: '#7c3aed',
        borderColor: '#7c3aed',
    },
    checkMark: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    emptyText: {
        color: '#9ca3af',
        textAlign: 'center',
        marginTop: 20,
        fontStyle: 'italic',
    },
    footer: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#374151',
        gap: 10,
    },
    skipBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        backgroundColor: '#4B5563',
        alignItems: 'center',
    },
    skipBtnText: {
        color: '#f3f4f6',
        fontWeight: 'bold',
        fontSize: 14,
    },
    cancelBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        backgroundColor: '#374151',
        alignItems: 'center',
    },
    cancelBtnText: {
        color: '#f3f4f6',
        fontSize: 14,
    },
    confirmBtn: {
        flex: 2,
        padding: 14,
        borderRadius: 12,
        backgroundColor: '#7c3aed',
        alignItems: 'center',
    },
    confirmBtnDisabled: {
        opacity: 0.4,
        backgroundColor: '#4B5563',
    },
    confirmBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    // ── Result styles ──────────────────────────────────────────────────────
    resultContainer: {
        width: '80%',
        maxWidth: 340,
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
        borderWidth: 3,
    },
    resultCorrect: {
        backgroundColor: '#052e16',
        borderColor: '#16a34a',
    },
    resultIncorrect: {
        backgroundColor: '#450a0a',
        borderColor: '#dc2626',
    },
    resultEmoji: {
        fontSize: 64,
        marginBottom: 12,
    },
    resultTitle: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    resultDesc: {
        fontSize: 18,
        color: '#e5e7eb',
        textAlign: 'center',
        lineHeight: 26,
        marginBottom: 8,
    },
    resultNote: {
        fontSize: 12,
        color: '#9ca3af',
        textAlign: 'center',
        fontStyle: 'italic',
        marginBottom: 24,
    },
    closeResultBtn: {
        paddingHorizontal: 32,
        paddingVertical: 14,
        backgroundColor: '#374151',
        borderRadius: 12,
    },
    closeResultBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
