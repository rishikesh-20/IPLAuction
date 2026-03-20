import { createContext, useContext, useState } from 'react';

const RoomContext = createContext(null);

export function RoomProvider({ children }) {
  const [room, setRoom] = useState(null); // { roomCode, roomName, status, config, auctioneerName }
  const [isAuctioneer, setIsAuctioneer] = useState(false);
  const [auctioneerToken, setAuctioneerToken] = useState(null); // raw UUID from localStorage

  function initRoom(roomData, auctioneer, token) {
    setRoom(roomData);
    setIsAuctioneer(!!auctioneer);
    setAuctioneerToken(token || null);
  }

  function updateRoomStatus(status) {
    setRoom((prev) => prev ? { ...prev, status } : prev);
  }

  function updateConfig(config) {
    setRoom((prev) => prev ? { ...prev, config: { ...prev.config, ...config } } : prev);
  }

  return (
    <RoomContext.Provider value={{ room, isAuctioneer, auctioneerToken, initRoom, updateRoomStatus, updateConfig }}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoom must be used within RoomProvider');
  return ctx;
}
