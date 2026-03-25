import { StyleSheet, Platform, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const gameMasterStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111827',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 5 : 60,
        paddingBottom: 10,
        backgroundColor: '#1F2937',
        zIndex: 10,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    phaseIndicator: {
        color: '#818CF8',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1.5,
    },
    headerIcon: {
        fontSize: 24,
    },
    logIconBtn: {
        padding: 8,
        backgroundColor: '#374151',
        borderRadius: 8,
    },
    body: {
        flex: 1,
        overflow: 'hidden',
    },

    // NIGHT PHASE
    nightContainer: {
        flex: 1,
        position: 'relative',
    },
    cardContainer: {
        flex: 1,
        marginHorizontal: 20,
        marginTop: 60,
        marginBottom: 80,
        borderRadius: 28,
        overflow: 'hidden',
        backgroundColor: '#1F2937',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    timerBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
    },
    nightActionsFixed: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        flexDirection: 'row',
        gap: 12,
        zIndex: 100,
    },

    // CARD INNER CONTENT
    cardInner: {
        flex: 1,
        padding: 12,
    },
    cardHeader: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    queueBtn: {
        minWidth: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: '#312E81',
        alignItems: 'center',
        justifyContent: 'center',
    },
    queueBtnText: {
        color: '#E5E7EB',
        fontWeight: '700',
        fontSize: 12,
    },
    cardCount: {
        color: '#6B7280',
        fontSize: 12,
        fontWeight: '600',
    },
    cardContent: {
        alignItems: 'center',
        marginBottom: 16,
    },
    cardIcon: {
        fontSize: 20,
        marginBottom: 8,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    cardTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#F9FAFB',
        textAlign: 'center',
    },
    infoBtn: {
        padding: 4,
    },
    infoBtnText: {
        fontSize: 15,
    },
    cardDesc: {
        fontSize: 16,
        color: '#9CA3AF',
        textAlign: 'center',
        lineHeight: 24,
    },

    // SKILL SECTION
    skillSection: {
        flex: 1,
        width: '100%',
        backgroundColor: '#111827',
        borderRadius: 16,
        padding: 16,
    },
    skillBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1F2937',
        borderRadius: 12,
        padding: 12,
    },
    skillIcon: {
        fontSize: 32,
        marginRight: 12,
    },
    skillInfo: {
        flex: 1,
    },
    skillName: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    skillFrequency: {
        color: '#9CA3AF',
        fontSize: 12,
        marginTop: 2,
    },
    skillTargetCount: {
        backgroundColor: '#374151',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    skillTargetCountText: {
        color: '#D1D5DB',
        fontSize: 12,
        fontWeight: '600',
    },
    restrictionText: {
        color: '#FBBF24',
        fontSize: 12,
        marginTop: 10,
        fontStyle: 'italic',
    },
    selectedTargetDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        padding: 10,
        backgroundColor: '#3730A3',
        borderRadius: 8,
    },
    selectedTargetLabel: {
        color: '#A5B4FC',
        fontSize: 14,
        marginRight: 8,
    },
    selectedTargetName: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    skillActionBtn: {
        marginTop: 16,
        backgroundColor: '#4F46E5',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    skillActionBtnDone: {
        backgroundColor: '#059669',
    },
    skillActionBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    instructionSection: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    instructionText: {
        color: '#9CA3AF',
        fontSize: 18,
        textAlign: 'center',
        width: '80%',
    },

    // DUAL ACTION STYLES
    dualActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#374151',
        padding: 12,
        borderRadius: 12,
        justifyContent: 'space-between',
    },
    dualActionTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    dualActionStatus: {
        color: '#9CA3AF',
        fontSize: 14,
    },
    smallActionBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        minWidth: 80,
        alignItems: 'center',
    },
    smallActionBtnText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
    },

    // ACTION BUTTONS
    actionButtonPrimary: {
        flex: 1,
        backgroundColor: '#6366F1',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    actionButtonSecondary: {
        flex: 1,
        backgroundColor: '#374151',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    actionBtnText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    actionBtnTextSec: {
        color: '#D1D5DB',
        fontWeight: '600',
        fontSize: 16,
    },
    disabledBtn: {
        opacity: 0.5,
    },

    // DAY PHASE STYLES
    dayContainer: {
        flex: 1,
        padding: 20,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    giantIcon: {
        fontSize: 96,
        marginBottom: 24,
    },
    phaseHeading: {
        fontSize: 32,
        fontWeight: '900',
        color: '#F9FAFB',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 8,
    },
    phaseSubtext: {
        fontSize: 18,
        color: '#9CA3AF',
        textAlign: 'center',
        marginBottom: 40,
    },
    phaseLabel: {
        fontSize: 14,
        color: '#6366F1',
        fontWeight: 'bold',
        letterSpacing: 2,
        marginBottom: 20,
    },
    mainBtn: {
        backgroundColor: '#6366F1',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 100,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
    },
    mainBtnText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    nightBtn: {
        backgroundColor: '#4C1D95',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: '#8B5CF6',
    },
    nightBtnText: {
        color: '#E9D5FF',
        fontSize: 18,
        fontWeight: 'bold',
    },

    // TIMER
    timerDisplay: {
        fontSize: 80,
        fontWeight: 'bold',
        color: '#F9FAFB',
        fontVariant: ['tabular-nums' as any],
        marginBottom: 30,
    },
    timerAlert: {
        color: '#EF4444',
    },
    timerControls: {
        flexDirection: 'row',
        marginBottom: 40,
    },
    iconBtn: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#374151',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconBtnText: {
        fontSize: 24,
        color: '#FFF',
    },

    // VOTING GRID
    phaseContainer: {
        flex: 1,
    },
    gridList: {
        flex: 1,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        paddingBottom: 100,
    },
    gridItem: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: '#1F2937',
        borderRadius: 12,
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    gridItemSelected: {
        backgroundColor: '#312E81',
        borderColor: '#6366F1',
    },
    playerBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginBottom: 8,
    },
    gridName: {
        color: '#FFF',
        fontSize: 12,
        textAlign: 'center',
        fontWeight: '500',
    },
    voteCardWrapper: {
        width: '31%',
        position: 'relative',
    },
    voteBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: '#10B981',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    voteBadgeText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: 'bold',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        gap: 12,
        paddingTop: 12,
        backgroundColor: '#111827',
    },
    secondaryBtn: {
        flex: 1,
        backgroundColor: '#374151',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    secondaryBtnText: {
        color: '#D1D5DB',
        fontWeight: '600',
        fontSize: 16,
    },
    dangerBtn: {
        flex: 1,
        backgroundColor: '#DC2626',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    dangerBtnText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },

    // RESULT
    resultText: {
        fontSize: 20,
        color: '#E5E7EB',
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 30,
        paddingHorizontal: 20,
    },

    // SIDEBAR
    sidebarOverlay: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        flexDirection: 'row',
    },
    sidebarBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sidebarContainer: {
        width: '80%',
        maxWidth: 320,
        backgroundColor: '#1F2937',
        padding: 24,
        paddingTop: Platform.OS === 'android' ? 40 : 60,
    },
    sidebarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
    },
    sidebarTitle: {
        color: '#F9FAFB',
        fontSize: 24,
        fontWeight: 'bold',
    },
    closeBtn: {
        color: '#9CA3AF',
        fontSize: 24,
        padding: 4,
    },
    sidebarMenu: {
        gap: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#374151',
        borderRadius: 12,
        gap: 12,
    },
    menuItemDestructive: {
        marginTop: 20,
        backgroundColor: '#450A0A',
        borderWidth: 1,
        borderColor: '#7F1D1D',
    },
    menuItemIcon: {
        fontSize: 20,
    },
    menuItemText: {
        fontSize: 16,
        color: '#E5E7EB',
        fontWeight: '500',
    },
    textDestructive: {
        color: '#FCA5A5',
    },
    sidebarDivider: {
        height: 1,
        backgroundColor: '#374151',
        marginVertical: 24,
    },
    sidebarSectionTitle: {
        color: '#9CA3AF',
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
    },
    sidebarLogBody: {
        flex: 1,
    },
    logRow: {
        flexDirection: 'row',
        marginBottom: 12,
        gap: 10,
    },
    logTime: {
        color: '#6B7280',
        fontSize: 12,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        minWidth: 45,
        marginTop: 2,
    },
    logMsg: {
        flex: 1,
        color: '#D1D5DB',
        fontSize: 14,
        lineHeight: 20,
    },
    emptyText: {
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 20,
        fontStyle: 'italic',
    },

    // MODAL COMMON
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        padding: 20,
    },
    modalPanel: {
        backgroundColor: '#1F2937',
        borderRadius: 20,
        maxHeight: '80%',
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#374151',
    },
    modalTitle: {
        color: '#F9FAFB',
        fontSize: 20,
        fontWeight: 'bold',
    },
    modalSubtitle: {
        color: '#9CA3AF',
        fontSize: 14,
        marginTop: 4,
    },
    modalBody: {
        padding: 20,
    },
    modalBodyScroll: {
        flex: 1,
    },
    modalFooter: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#374151',
        gap: 12,
    },

    // PLAYER ROW
    playerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111827',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#6B7280',
    },
    playerRowSelected: {
        backgroundColor: '#312E81',
        borderColor: '#6366F1',
    },
    playerRowDisabled: {
        opacity: 0.5,
    },
    playerInfo: {
        flex: 1,
    },
    playerName: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    playerNameSelected: {
        color: '#FFFFFF',
    },
    playerNameDisabled: {
        color: '#9CA3AF',
    },
    playerRoleText: {
        color: '#EF4444',
        fontSize: 12,
    },
    checkBox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#4B5563',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkBoxSelected: {
        backgroundColor: '#6366F1',
        borderColor: '#6366F1',
    },
    checkMark: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    saveBtn: {
        backgroundColor: '#6366F1',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveBtnDisabled: {
        backgroundColor: '#374151',
        opacity: 0.7,
    },
    saveBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },

    // Central Action Button
    actionButtonSmall: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#374151',
        justifyContent: 'center',
        alignItems: 'center',
    },
    centralActionButton: {
        flex: 1,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    centralActionButtonAssign: {
        backgroundColor: '#F59E0B', // Amber for assignment
    },
    centralActionButtonAction: {
        backgroundColor: '#6366F1', // Indigo for action
    },
    centralActionButtonDone: {
        backgroundColor: '#10B981', // Emerald for done
    },
    centralActionButtonDisabled: {
        backgroundColor: '#374151', // Gray for disabled
        opacity: 0.7,
    },
    centralActionButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 15,
    },

    // Role Assignment Modal
    roleListLabel: {
        color: '#9CA3AF',
        fontSize: 14,
        marginBottom: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    roleOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111827',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#374151',
    },
    roleOptionSelected: {
        backgroundColor: '#1E1B4B',
        borderColor: '#6366F1',
    },
    roleOptionDisabled: {
        opacity: 0.5,
    },
    playerColorDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
    },
    roleOptionInfo: {
        flex: 1,
    },
    roleOptionName: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '500',
    },
    roleOptionNameDisabled: {
        color: '#9CA3AF',
    },
    roleOptionCount: {
        color: '#6B7280',
        fontSize: 12,
    },
    roleOptionCheck: {
        color: '#6366F1',
        fontWeight: 'bold',
        fontSize: 16,
    },

    // PLAYER LIST MODAL
    playerListItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#374151',
    },
    playerColorDotBig: {
        width: 16,
        height: 16,
        borderRadius: 8
    },
    playerNameList: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    playerDeadText: {
        color: '#9CA3AF',
        textDecorationLine: 'line-through',
    },
    playerRoleTextList: {
        color: '#9CA3AF',
        fontSize: 13,
    },
    deadLabel: {
        color: '#EF4444',
        fontSize: 12,
        fontWeight: 'bold',
        backgroundColor: '#450A0A',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },

    // DUAL ACTION CARD
    dualActionCard: {
        backgroundColor: '#111827',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#374151',
    },
    dualActionCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    dualActionCardIcon: {
        fontSize: 24,
        marginRight: 12,
    },
    dualActionCardTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    dualActionStatusBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1F2937',
        padding: 10,
        borderRadius: 8,
    },
    dualActionStatusText: {
        color: '#10B981',
        fontWeight: '500',
        flex: 1,
    },
    dualActionClearBtn: {
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    dualActionClearBtnText: {
        color: '#EF4444',
        fontWeight: '600',
        fontSize: 12,
    },
    dualActionButton: {
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    dualActionButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    dualActionUsedText: {
        color: '#9CA3AF',
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 8,
    },

    // ACTION STATUS DISPLAY
    actionStatusContainer: {
        marginTop: 10,
        marginBottom: 10,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 8,
        padding: 8,
    },
    actionStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    actionStatusIcon: {
        fontSize: 16,
        marginRight: 8,
    },
    actionStatusText: {
        color: '#A7F3D0',
        fontSize: 14,
        fontWeight: '500',
    },
    lockedSkillSection: {
        marginTop: 20,
        padding: 20,
        backgroundColor: '#1F2937',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#374151',
        borderStyle: 'dashed'
    },
    lockedSkillText: {
        color: '#6B7280',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    actionHintText: {
        color: '#6366F1',
        textAlign: 'center',
        fontSize: 12,
        marginTop: 15,
        fontWeight: '600',
        opacity: 0.8
    },
    wolfNavigatorContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#0B0B10',
        zIndex: 1000,
        padding: 10,
        borderRadius: 20,
    }
});
