/**
 * LoversRevealModal - Modal to notify GM about lovers creation
 * 
 * Shows after Cupid creates lovers, providing GM with:
 * - Who the lovers are
 * - Whether they are same team or different team
 * - Instructions for announcing to players
 */

import React from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { Player, Role } from '../types';

interface LoversInfo {
    player1Id: string;
    player2Id: string;
    player1Name: string;
    player2Name: string;
    sameTeam: boolean;
    originalTeams?: {
        [playerId: string]: string;
    };
}

interface LoversRevealModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirmSelection?: (player1Id: string, player2Id: string) => void;
    loversInfo: LoversInfo | null;
    players: Player[];
    availableRoles: Role[];
}

export function LoversRevealModal({
    visible,
    onClose,
    onConfirmSelection,
    loversInfo,
    players,
    availableRoles,
}: LoversRevealModalProps) {
    const [selectedPlayerIds, setSelectedPlayerIds] = React.useState<string[]>([]);

    React.useEffect(() => {
        if (loversInfo) {
            setSelectedPlayerIds([loversInfo.player1Id, loversInfo.player2Id]);
        } else {
            setSelectedPlayerIds([]);
        }
    }, [loversInfo, visible]);

    if (!visible) return null;

    const handlePlayerSelect = (playerId: string) => {
        setSelectedPlayerIds(prev => {
            if (prev.includes(playerId)) {
                return prev.filter(id => id !== playerId);
            }
            if (prev.length >= 2) {
                return [prev[1], playerId];
            }
            return [...prev, playerId];
        });
    };

    const handleConfirm = () => {
        if (selectedPlayerIds.length !== 2) {
            alert('Vui lòng chọn 2 người chơi');
            return;
        }
        if (onConfirmSelection) {
            onConfirmSelection(selectedPlayerIds[0], selectedPlayerIds[1]);
        }
        onClose();
    };

    const target1 = players.find(p => p.id === selectedPlayerIds[0]);
    const target2 = players.find(p => p.id === selectedPlayerIds[1]);
    
    const role1 = availableRoles.find(r => r.id === target1?.roleId);
    const role2 = availableRoles.find(r => r.id === target2?.roleId);
    
    const isSameTeam = role1 && role2 ? role1.team === role2.team : loversInfo?.sameTeam ?? false;

    const getTeamColor = (team: string): string => {
        switch (team) {
            case 'werewolf': return '#dc2626';
            case 'villager': return '#16a34a';
            case 'vampire': return '#9333ea';
            case 'neutral': return '#94a3b8';
            default: return '#888';
        }
    };

    const getTeamName = (team: string): string => {
        switch (team) {
            case 'werewolf': return 'Sói';
            case 'villager': return 'Dân làng';
            case 'vampire': return 'Ma cà rồng';
            case 'neutral': return 'Trung lập';
            default: return team;
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={[
                        styles.header,
                        isSameTeam ? styles.headerSameTeam : styles.headerDifferentTeam
                    ]}>
                        <Text style={styles.headerIcon}>💑</Text>
                        <Text style={styles.headerTitle}>
                            {loversInfo ? 'CẶP ĐÔI ĐÃ ĐƯỢC TẠO!' : 'THIẾT LẬP CẶP ĐÔI'}
                        </Text>
                        <View style={[
                            styles.teamBadge,
                            isSameTeam ? styles.teamBadgeSame : styles.teamBadgeDiff
                        ]}>
                            <Text style={styles.teamBadgeText}>
                                {isSameTeam ? '✓ CÙNG PHE' : '⚠️ KHÁC PHE'}
                            </Text>
                        </View>
                    </View>

                    {/* Lovers Selection / Info */}
                    {!loversInfo && (
                        <View style={styles.selectionSection}>
                            <Text style={styles.sectionTitle}>Chọn cặp đôi (Gán thủ công)</Text>
                            <ScrollView style={styles.playerList} contentContainerStyle={styles.playerListContent}>
                                {players.filter(p => p.isAlive).map(player => {
                                    const isSelected = selectedPlayerIds.includes(player.id);
                                    const role = availableRoles.find(r => r.id === player.roleId);
                                    return (
                                        <TouchableOpacity
                                            key={player.id}
                                            style={[styles.playerCard, isSelected && styles.playerCardSelected]}
                                            onPress={() => handlePlayerSelect(player.id)}
                                        >
                                            <View style={[styles.loverColorIcon, { backgroundColor: player.color }]} />
                                            <Text style={styles.playerNameText}>{player.name}</Text>
                                            {role && <Text style={styles.playerRoleSmall}>({role.name})</Text>}
                                            {isSelected && <Text style={styles.checkMark}>💘</Text>}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    )}

                    {(loversInfo || selectedPlayerIds.length === 2) && (
                        <View style={styles.loversSection}>
                            <View style={styles.loverCard}>
                                <View style={[styles.loverColor, { backgroundColor: target1?.color || '#888' }]} />
                                <View style={styles.loverInfo}>
                                    <Text style={styles.loverName}>{target1?.name || 'Unknown'}</Text>
                                    <Text style={styles.loverRole}>
                                        {role1?.iconEmoji} {role1?.name}
                                    </Text>
                                    <View style={[
                                        styles.loverTeam,
                                        { backgroundColor: getTeamColor(role1?.team || 'neutral') + '30' }
                                    ]}>
                                        <Text style={[
                                            styles.loverTeamText,
                                            { color: getTeamColor(role1?.team || 'neutral') }
                                        ]}>
                                            Phe {getTeamName(role1?.team || 'neutral')}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <Text style={styles.heartIcon}>💕</Text>

                            <View style={styles.loverCard}>
                                <View style={[styles.loverColor, { backgroundColor: target2?.color || '#888' }]} />
                                <View style={styles.loverInfo}>
                                    <Text style={styles.loverName}>{target2?.name || 'Unknown'}</Text>
                                    <Text style={styles.loverRole}>
                                        {role2?.iconEmoji} {role2?.name}
                                    </Text>
                                    <View style={[
                                        styles.loverTeam,
                                        { backgroundColor: getTeamColor(role2?.team || 'neutral') + '30' }
                                    ]}>
                                        <Text style={[
                                            styles.loverTeamText,
                                            { color: getTeamColor(role2?.team || 'neutral') }
                                        ]}>
                                            Phe {getTeamName(role2?.team || 'neutral')}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* GM Instructions */}
                    <View style={styles.instructionsSection}>
                        <Text style={styles.instructionsTitle}>📋 Hướng dẫn cho GM:</Text>
                        <View style={styles.instructionsList}>
                            <Text style={styles.instructionItem}>
                                1. Gọi 2 người này ra (hoặc cho mở mắt nếu online)
                            </Text>
                            <Text style={styles.instructionItem}>
                                2. Cho họ biết mặt nhau là cặp đôi
                            </Text>
                            <Text style={styles.instructionItem}>
                                3. Ra dấu hiệu về phe (không nói rõ):
                            </Text>
                            <View style={[
                                styles.signalBox,
                                isSameTeam ? styles.signalBoxSame : styles.signalBoxDiff
                            ]}>
                                {isSameTeam ? (
                                    <Text style={styles.signalText}>
                                        👍 Gật đầu = "Cùng phe"
                                    </Text>
                                ) : (
                                    <Text style={styles.signalText}>
                                        👎 Lắc đầu = "Khác phe"
                                    </Text>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Win Condition Info */}
                    <View style={[
                        styles.winConditionSection,
                        isSameTeam ? styles.winConditionSame : styles.winConditionDiff
                    ]}>
                        <Text style={styles.winConditionTitle}>🏆 Điều kiện thắng:</Text>
                        {isSameTeam ? (
                            <Text style={styles.winConditionText}>
                                Cặp đôi sẽ thắng cùng phe gốc của họ.{'\n'}
                                Cả hai giữ nguyên vai trò và kỹ năng.
                            </Text>
                        ) : (
                            <Text style={styles.winConditionText}>
                                ⚠️ Cặp đôi giờ là PHE RIÊNG!{'\n'}
                                Họ chỉ thắng nếu là 2 người cuối cùng còn sống.{'\n'}
                                Cả hai giữ nguyên vai trò và kỹ năng.
                            </Text>
                        )}
                    </View>

                    {/* Linked Fate Warning */}
                    <View style={styles.linkedFateSection}>
                        <Text style={styles.linkedFateIcon}>💔</Text>
                        <Text style={styles.linkedFateText}>
                            NẾU MỘT NGƯỜI CHẾT, NGƯỜI KIA CŨNG CHẾT!
                        </Text>
                    </View>

                    {/* Close Button */}
                    <TouchableOpacity 
                        style={styles.closeBtn} 
                        onPress={loversInfo ? onClose : handleConfirm}
                    >
                        <Text style={styles.closeBtnText}>
                            {loversInfo ? '✓ Đã hiểu' : '💘 Xác nhận Se duyên'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    container: {
        width: '100%',
        maxWidth: 450,
        backgroundColor: '#1a1a2e',
        borderRadius: 16,
        overflow: 'hidden',
    },
    header: {
        padding: 20,
        alignItems: 'center',
        borderBottomWidth: 2,
    },
    headerSameTeam: {
        backgroundColor: '#052e16',
        borderBottomColor: '#16a34a',
    },
    headerDifferentTeam: {
        backgroundColor: '#450a0a',
        borderBottomColor: '#dc2626',
    },
    headerIcon: {
        fontSize: 48,
        marginBottom: 8,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
    },
    teamBadge: {
        marginTop: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    teamBadgeSame: {
        backgroundColor: '#16a34a',
    },
    teamBadgeDiff: {
        backgroundColor: '#dc2626',
    },
    teamBadgeText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    loversSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#252545',
    },
    loverCard: {
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#2a2a4a',
        borderRadius: 12,
        minWidth: 120,
    },
    loverColor: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginBottom: 8,
    },
    loverColorIcon: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 10,
    },
    loverInfo: {
        alignItems: 'center',
    },
    loverName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    playerNameText: {
        fontSize: 16,
        color: '#fff',
    },
    loverRole: {
        fontSize: 12,
        color: '#aaa',
        marginTop: 4,
    },
    loverTeam: {
        marginTop: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    loverTeamText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    heartIcon: {
        fontSize: 32,
        marginHorizontal: 16,
    },
    instructionsSection: {
        padding: 16,
        backgroundColor: '#1e1e3e',
    },
    instructionsTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#ffd700',
        marginBottom: 12,
    },
    instructionsList: {},
    instructionItem: {
        fontSize: 13,
        color: '#ccc',
        marginBottom: 8,
        paddingLeft: 8,
    },
    signalBox: {
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
        marginLeft: 20,
    },
    signalBoxSame: {
        backgroundColor: '#052e16',
        borderWidth: 1,
        borderColor: '#16a34a',
    },
    signalBoxDiff: {
        backgroundColor: '#450a0a',
        borderWidth: 1,
        borderColor: '#dc2626',
    },
    signalText: {
        fontSize: 14,
        color: '#fff',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    winConditionSection: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    winConditionSame: {
        backgroundColor: '#0a2e1a',
    },
    winConditionDiff: {
        backgroundColor: '#2e0a0a',
    },
    winConditionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#ffd700',
        marginBottom: 8,
    },
    winConditionText: {
        fontSize: 13,
        color: '#ccc',
        lineHeight: 20,
    },
    linkedFateSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backgroundColor: '#3d1a1a',
        borderTopWidth: 1,
        borderTopColor: '#dc2626',
    },
    linkedFateIcon: {
        fontSize: 20,
        marginRight: 8,
    },
    linkedFateText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#ef4444',
    },
    closeBtn: {
        padding: 18,
        backgroundColor: '#e91e63',
        alignItems: 'center',
    },
    closeBtnText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    selectionSection: {
        maxHeight: 300,
        backgroundColor: '#252545',
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    sectionTitle: {
        padding: 12,
        color: '#ffd700',
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    playerList: {
        flex: 1,
    },
    playerListContent: {
        padding: 12,
    },
    playerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#2a2a4a',
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    playerCardSelected: {
        borderColor: '#e91e63',
        backgroundColor: '#3a2a4a',
    },
    playerRoleSmall: {
        fontSize: 11,
        color: '#888',
        marginLeft: 8,
    },
    checkMark: {
        marginLeft: 'auto',
        fontSize: 16,
    },
});
