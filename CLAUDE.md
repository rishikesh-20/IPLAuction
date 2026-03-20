# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Server (port 5001)
cd server && npm run dev       # nodemon watch mode
cd server && npm start         # production
cd server && npm run seed      # seed ~100 IPL players into MongoDB

# Client (port 5173)
cd client && npm run dev       # Vite dev server
cd client && npm run build     # production build
```

MongoDB must be running locally before starting the server:
```bash
brew services start mongodb/brew/mongodb-community
```

After editing server files, nodemon auto-restarts — this **clears all in-memory auction state** (timers, active bids). Any in-progress auction is lost. Always create a fresh room after a server restart.

## Architecture

### Server
- **`src/index.js`** — Express + Socket.io bootstrap. Mounts REST routes at `/api` and registers all socket handlers.
- **`src/socket/auctionHandlers.js`** — All auction socket events: `start-auction`, `place-bid`, `next-player`, `mark-unsold`, `pause-auction`, `resume-auction`.
- **`src/socket/roomHandlers.js`** — `join-room`, `leave-room`, `disconnecting`. Builds and emits full `room-state` snapshot on join.
- **`src/services/auctionService.js`** — Core auction logic: bid validation, `finalizeSale`, `finalizeUnsold`, auto-advance. Uses `async-mutex` per room to serialize concurrent bids. Auction state lives in `Map<roomCode, AuctionState>` — never persisted.
- **`src/socket/timerManager.js`** — Per-room timer state machine in `Map<roomCode, TimerState>`. `onBid()` resets timer to full duration on every bid (not just extension). Timer callbacks call `finalizeSale` or `finalizeUnsold` at 0.
- **`src/config/constants.js`** — Canonical bid increment tiers (server is authoritative). Client `utils/bidTiers.js` is a display-only copy.

### Client
- **Context tree:** `RoomProvider → TeamProvider → AuctionProvider → Router`. All Socket.io event subscriptions live in `AuctionContext.jsx`.
- **Socket singleton** (`src/socket/socket.js`) — created with `autoConnect: false`. Pages call `socket.connect()` on mount and emit `join-room` manually.
- **Reconnection:** `sessionStorage` holds `roomCode`, `teamId`, `isAuctioneer`, `auctioneerToken`. On page load/refresh, each page re-emits `join-room` using stored values. Server matches `teamId` to existing Team doc and restores full state.
- **`AuctionPage` / `LobbyPage`** guard: if `sessionStorage.roomCode !== route param`, redirect to `/`. This means clearing sessionStorage while on these pages causes navigation to `/`.

### Key Data Flow
1. Auctioneer creates room (REST `POST /api/rooms`) → receives `auctioneerToken` (UUID, stored in `localStorage`) and optional `auctioneerTeamId` (if they entered a team name).
2. Players join via `join-room` socket event → server creates Team doc, broadcasts `team-joined`.
3. Auctioneer emits `start-auction` → server loads first player, starts timer, broadcasts `player-queued`.
4. Teams emit `place-bid` → mutex-serialized validation → broadcasts `bid-update` or `bid-rejected` (to sender only).
5. Timer hits 0 → `finalizeSale` or `finalizeUnsold` → 3s delay → auto-advance to next player.

### Auctioneer as Bidder
If `auctioneerTeamName` is provided at room creation, a Team doc is created and stored as `room.auctioneerTeamId`. On `join-room`, the server sets the team's `socketId` to the auctioneer's socket. The auctioneer sees both BidButton and AuctioneerControls.

### Bid Validation (server-authoritative)
Bids are accepted if: `amount >= getNextBidAmount(currentBid)` AND `amount % 5 === 0`. This allows jump-bidding above the minimum tier increment. The client UI shows quick-select chips (next 3 tier amounts) and a custom `±5L` input.

### Port Note
macOS ControlCenter occupies port 5000. Server runs on **5001**. All configs (`server/.env`, `client/.env`, `client/vite.config.js`) use 5001. Client proxies `/api` → `http://localhost:5001` via Vite.
