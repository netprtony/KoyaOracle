
import { resolveNightEvents } from '../NightResolution';
import { NightAction, Player, Role } from '../../types';

// Mock Data
const roles: Role[] = [
    {
        id: 'bao_ve', name: 'Bảo Vệ', team: 'villager', iconEmoji: '🛡️',
        skills: { nightAction: { type: 'protect', frequency: 'everyNight', targetCount: 1 } },
        winConditions: { primary: 'villagerTeamWins' }
    },
    {
        id: 'soi', name: 'Sói', team: 'werewolf', iconEmoji: '🐺',
        skills: { nightAction: { type: 'kill', frequency: 'everyNight', targetCount: 1, isGroupAction: true } },
        winConditions: { primary: 'werewolfTeamWins' }
    },
    {
        id: 'phu_thuy', name: 'Phù Thủy', team: 'villager', iconEmoji: '🧙',
        skills: { nightAction: { type: 'dual', frequency: 'everyNight', actions: [{ type: 'heal', uses: 1 }, { type: 'kill', uses: 1 }] } },
        winConditions: { primary: 'villagerTeamWins' }
    }
] as any;

const players: Player[] = [
    { id: 'p1', name: 'Alice (Guard)', roleId: 'bao_ve', isAlive: true, color: '#000', position: 1 },
    { id: 'p2', name: 'Bob (Wolf)', roleId: 'soi', isAlive: true, color: '#000', position: 2 },
    { id: 'p3', name: 'Charlie (Witch)', roleId: 'phu_thuy', isAlive: true, color: '#000', position: 3 },
    { id: 'p4', name: 'Dave (Villager)', roleId: 'dan_lang', isAlive: true, color: '#000', position: 4 },
];

console.log('--- Test 1: Wolf Kills Dave, No Protection ---');
const actions1: NightAction[] = [
    { roleId: 'soi', targetPlayerId: 'p4', timestamp: 1, actionType: 'kill' }
];
const res1 = resolveNightEvents(actions1, players, roles);
console.log('Dead:', res1.deadPlayerIds); // Expect ['p4']

console.log('--- Test 2: Wolf Kills Dave, Witch Saves Dave ---');
const actions2: NightAction[] = [
    { roleId: 'soi', targetPlayerId: 'p4', timestamp: 1, actionType: 'kill' },
    { roleId: 'phu_thuy', targetPlayerId: 'p4', timestamp: 2, actionType: 'heal' }
];
const res2 = resolveNightEvents(actions2, players, roles);
console.log('Dead:', res2.deadPlayerIds); // Expect []
console.log('Messages:', res2.messages);

console.log('--- Test 3: Witch Kills Bob ---');
const actions3: NightAction[] = [
    { roleId: 'phu_thuy', targetPlayerId: 'p2', timestamp: 2, actionType: 'kill' }
];
const res3 = resolveNightEvents(actions3, players, roles);
console.log('Dead:', res3.deadPlayerIds); // Expect ['p2']

console.log('--- Test 4: Wolf Kills Dave, Guard Protects Dave ---');
const actions4: NightAction[] = [
    { roleId: 'soi', targetPlayerId: 'p4', timestamp: 1, actionType: 'kill' },
    { roleId: 'bao_ve', targetPlayerId: 'p4', timestamp: 2, actionType: 'none' } // Assuming guard logic checks role/target
];
// Note: My guard logic implementation in NightResolution checks 'action.roleId === bao_ve'.
// It assumes non-null target.
actions4[1].targetPlayerId = 'p4';
const res4 = resolveNightEvents(actions4, players, roles);
console.log('Dead:', res4.deadPlayerIds); // Expect [] because of guard

console.log('--- Test 5: Dead Witch Tries to Kill ---');
const deadWitchPlayers = JSON.parse(JSON.stringify(players));
deadWitchPlayers[2].isAlive = false; // Charlie is dead
const actions5: NightAction[] = [
    { roleId: 'phu_thuy', targetPlayerId: 'p2', timestamp: 1, actionType: 'kill' }
];
const res5 = resolveNightEvents(actions5, deadWitchPlayers, roles);
console.log('Dead:', res5.deadPlayerIds); // Expect [] because witch is dead
