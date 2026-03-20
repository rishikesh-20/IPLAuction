import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RoomProvider } from './context/RoomContext';
import { TeamProvider } from './context/TeamContext';
import { AuctionProvider } from './context/AuctionContext';
import LandingPage from './pages/LandingPage';
import LobbyPage from './pages/LobbyPage';
import AuctionPage from './pages/AuctionPage';
import SummaryPage from './pages/SummaryPage';

function AppProviders({ children }) {
  return (
    <RoomProvider>
      <TeamProvider>
        <AuctionProvider>
          {children}
        </AuctionProvider>
      </TeamProvider>
    </RoomProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/lobby/:roomCode" element={<LobbyPage />} />
          <Route path="/auction/:roomCode" element={<AuctionPage />} />
          <Route path="/summary/:roomCode" element={<SummaryPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppProviders>
    </BrowserRouter>
  );
}
