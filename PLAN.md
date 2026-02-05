Multi-KINH Claims & Card Challenge Feature
Summary
Support multiple simultaneous KINH claims. When multiple players claim KINH at the same time, the owner can verify each claim individually OR trigger a "Thu Thach" (Challenge) card mini-game to determine the winner.

Files to Modify
Backend
apps/backend/src/modules/game/game.service.ts - Core state model change
apps/backend/src/modules/gateway/game.gateway.ts - Socket event handlers
Frontend
apps/frontend/src/app/features/room/room.component.ts - Orchestrator signals + listeners
apps/frontend/src/app/features/room/components/kinh-claim-overlay/kinh-claim-overlay.component.ts - Multi-claim overlay
apps/frontend/src/app/features/room/components/game-controls/game-controls.component.ts - Per-claim approve/reject + challenge button
apps/frontend/src/app/features/room/components/player-list/player-list.component.ts - Array of claimant IDs
NEW apps/frontend/src/app/features/room/components/challenge-overlay/challenge-overlay.component.ts - Card challenge mini-game UI
Step 1: Backend game.service.ts - Data Structure Changes
Change currentKinhClaim (single object) to kinhClaims (array) in InMemoryGameState:


// Add new interfaces
interface KinhClaimEntry {
  userId: number;
  ticketId: number;
  winType: WinType;
  lineDetails: LineDetails;
  preValidated: boolean;
  claimOrder: number;
}

interface ChallengeState {
  cards: number[];                          // 10 random values 0-99
  picks: Map<number, { cardIndex: number; value: number }>; // userId -> pick
  participantIds: number[];
  timeoutTimer: ReturnType<typeof setTimeout> | null;
  status: 'picking' | 'done';
}

// In InMemoryGameState, replace:
//   currentKinhClaim: {...} | null
// With:
  kinhClaims: KinhClaimEntry[];
  challenge: ChallengeState | null;
Update createSession() and recoverSessionForRoom() to initialize kinhClaims: [] and challenge: null.

Step 2: Backend game.service.ts - Rewrite Methods
handleKinhClaim() - Accept additional claims when paused_for_kinh
Allow claims when status is active OR paused_for_kinh
Prevent duplicate claims from same user
First claim pauses game; subsequent claims append to array
Return { preValidated, isFirstClaim, claimOrder }
approveKinhForUser(sessionId, winnerId) - Approve specific claim
Find claim by userId in kinhClaims array
Clear all claims, set status finished, save GameResult
rejectKinhForUser(sessionId, rejectedUserId) - Reject specific claim
Remove claim from array, penalize player
If no claims remain, resume game (status -> active)
Return { remainingClaims }
New: startChallenge(sessionId)
Require >= 2 claims
Generate 10 unique random numbers 0-99
Store in challenge state with participant IDs
Return the ChallengeState
New: pickChallengeCard(sessionId, userId, cardIndex)
Validate: participant, not already picked, card not taken
Store pick, return { value, allPicked }
New: resolveChallengeWinner(sessionId)
Find highest value among picks
Return { winnerId, picks }
Step 3: Backend game.gateway.ts - Rewrite Event Handlers
Rewrite handleKinhClaim (kinh:claim)
On first claim: stop auto-call, emit game:paused
Build full claims payload with user info + winning numbers
Emit kinh:claims-updated to all players (replaces kinh:claimed)
Emit kinh:verify-request to owner with array of verify data
Add helper: buildClaimsPayload(sessionId)
Fetches user info + ticket rows for each claim
Extracts winning numbers server-side (move extractWinningNumbers to gateway)
Add helper: buildVerifyPayloads(sessionId)
For owner: ticket data + calledNumbers + preValidated for each claim
Rewrite handleKinhApprove (kinh:approve)
Accept optional userId in payload (backward compat: defaults to first claim)
Use approveKinhForUser() then same winner announcement flow
Rewrite handleKinhReject (kinh:reject)
Accept optional userId in payload
If remaining claims > 0: emit updated kinh:claims-updated + kinh:verify-request
If remaining claims = 0: emit game:resumed, restart auto-call if applicable
New: handleStartChallenge (kinh:start-challenge)
Owner only. Call startChallenge() on service
Emit challenge:started to room with: { totalCards, participants, timeoutSeconds: 30 }
Start 30s timeout timer
New: handleChallengePickCard (challenge:pick-card)
Call pickChallengeCard() on service
Emit challenge:card-picked to room (cardIndex + userId, NO value)
Emit challenge:your-pick privately to picker (cardIndex + value)
If allPicked: trigger resolveChallenge()
New: resolveChallenge(sessionId, roomId) private method
Clear timeout timer
Call resolveChallengeWinner()
Emit challenge:result to room with all picks revealed + allCardValues
After 4s delay: auto-approve the challenge winner (same flow as kinh:approve)
New: resolveChallengeTimeout(sessionId, roomId) private method
Force resolve with whoever has picked (non-pickers lose by default)
Step 4: Frontend - New ChallengeOverlayComponent
Create apps/frontend/src/app/features/room/components/challenge-overlay/challenge-overlay.component.ts

Inputs:

cards: { picked: boolean; pickedBy: string | null }[] (10 items)
participants: { userId: number; displayName: string; avatarUrl: string | null }[]
myPick: { cardIndex: number; value: number } | null
result: { winnerId, winnerDisplayName, picks[], allCardValues[] } | null
isParticipant: boolean
timeoutSeconds: number
Output: cardPicked: EventEmitter<number> (card index)

UI Layout:

Full-screen backdrop (z-index: 2500, above kinh overlay)
Header: "Thu Thach Boc Bai"
Participants row with avatar + picked status
10 cards grid (2x5): face-down with "?" until picked/revealed
My pick shows my value, others show face-down with name
Countdown timer
After result: flip all cards, highlight winner row
Step 5: Frontend - Modify KinhClaimOverlayComponent
Change @Input() data: KinhClaimOverlayData to @Input() claims: KinhClaimOverlayData[]

Update KinhClaimOverlayData interface to include userId, claimOrder, preValidated.

Template:

Single claim: same as current (avatar + name + winning numbers)
Multiple claims: show count header + loop each claimant as a card with avatar, name, winType, winning numbers
Step 6: Frontend - Modify GameControlsComponent
Change inputs/outputs:

@Input() kinhClaimant -> @Input() kinhClaims: VerifyClaimData[]
@Output() approveKinh emits number (userId)
@Output() rejectKinh emits number (userId)
New @Output() startChallenge = new EventEmitter<void>()
Template paused_for_kinh case:

Loop each claim with name + winType + preValidated indicator
Per-claim approve/reject buttons
"Thu Thach" button when kinhClaims.length >= 2
Step 7: Frontend - Modify PlayerListComponent
Change @Input() kinhClaimantId: number | null to @Input() kinhClaimantIds: number[]

Update template conditions from === kinhClaimantId to .includes(userId).

Step 8: Frontend - Modify room.component.ts
Signal changes:

kinhClaimant -> REMOVE
kinhClaimantUserId -> kinhClaimantUserIds = signal<number[]>([])
kinhClaimOverlay -> kinhClaims = signal<KinhClaimOverlayData[]>([])
verifyTicket -> verifyClaims = signal<VerifyClaimData[]>([])
verifyMarkedCells -> REMOVE (moved into VerifyClaimData)
verifyWinCells -> REMOVE (moved into VerifyClaimData)

NEW: challengeActive = signal(false)
NEW: challengeCards = signal<{picked: boolean; pickedBy: string|null}[]>([])
NEW: challengeParticipants = signal<...[]>([])
NEW: challengeMyPick = signal<{cardIndex: number; value: number} | null>(null)
NEW: challengeResult = signal<ChallengeResultData | null>(null)
NEW: challengeTimeoutSeconds = signal(30)
Socket listeners:
Replace kinh:claimed with kinh:claims-updated -> sets kinhClaims + kinhClaimantUserIds
Replace single kinh:verify-request with array version -> processes each claim's markedCells/winCells
Add challenge:started -> set challengeActive, cards, participants
Add challenge:card-picked -> update card state
Add challenge:your-pick -> set myPick
Add challenge:result -> set result
Template:
Kinh overlay: @if (kinhClaims().length > 0 && !isOwner() && !challengeActive())
Verify sections: @for (claim of verifyClaims(); track claim.userId) with individual ticket display
Challenge overlay: @if (challengeActive())
Game controls: pass kinhClaims array, bind startChallenge event
Action methods:
approveKinh(userId) and rejectKinh(userId) now accept userId
New startChallenge() emits kinh:start-challenge
New onChallengeCardPicked(cardIndex) emits challenge:pick-card
Reset handlers:
game:reset and game:resumed: clear all kinh + challenge signals
Step 9: Build & Test
npm run build:shared (if shared types changed)
npm run build:backend
npm run build:frontend
Manual test with multiple browser tabs
New Socket Events Summary
Event	Direction	Payload
kinh:claims-updated	Server -> All	{ claims: KinhClaimOverlayData[] }
kinh:verify-request	Server -> Owner	{ claims: VerifyPayload[] }
kinh:start-challenge	Client -> Server	{ sessionId }
challenge:started	Server -> All	{ totalCards, participants[], timeoutSeconds }
challenge:pick-card	Client -> Server	{ sessionId, cardIndex }
challenge:card-picked	Server -> All	{ userId, displayName, cardIndex }
challenge:your-pick	Server -> Picker	{ cardIndex, value }
challenge:result	Server -> All	{ winnerId, winnerDisplayName, picks[], allCardValues[] }
Edge Cases
Duplicate claim from same user: Blocked by service (throw error)
Race condition on card pick: Server validates card not already taken
Timeout with no picks: Resolve with existing picks; if zero picks, let owner manually decide
All claims rejected: Auto-resume game when remainingClaims === 0
Disconnect during challenge: Non-picker gets value -1, loses by default