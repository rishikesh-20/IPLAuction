import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import CreateRoomForm from '../components/landing/CreateRoomForm';
import JoinRoomForm from '../components/landing/JoinRoomForm';

export default function LandingPage() {
  const [searchParams] = useSearchParams();
  const prefilledRoom = searchParams.get('room') || '';
  const prefilledError = searchParams.get('error') === 'name'
    ? 'The name you entered does not match the team owner. Please enter your original name.'
    : '';
  const [tab, setTab] = useState(prefilledRoom ? 'join' : 'create');

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/ipl_logo.png" alt="IPL" className="h-20 mx-auto mb-3 object-contain rounded-2xl" />
          <h1 className="text-3xl font-black text-white tracking-tight">IPL Auction</h1>
          <p className="text-slate-400 mt-1 text-sm">Real-time live auction with friends</p>
        </div>

        {/* Card */}
        <div className="card p-6">
          {/* Tabs */}
          <div className="flex bg-slate-900 rounded-lg p-1 mb-6">
            <button
              onClick={() => setTab('create')}
              className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${tab === 'create' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'}`}
            >
              Create Room
            </button>
            <button
              onClick={() => setTab('join')}
              className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${tab === 'join' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'}`}
            >
              Join Room
            </button>
          </div>

          {tab === 'create' ? <CreateRoomForm /> : <JoinRoomForm prefilledRoom={prefilledRoom} prefilledError={prefilledError} />}
        </div>

        <p className="text-center text-slate-600 text-xs mt-4">
          IPL-style auction • Real-time bidding • Multiple teams
        </p>
      </div>
    </div>
  );
}
