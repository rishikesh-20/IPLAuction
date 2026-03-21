import { useState } from 'react';
import { useTeams } from '../../context/TeamContext';
import EmergencyFundModal from './EmergencyFundModal';

export default function EmergencyFundButton() {
  const { myTeam } = useTeams();
  const [modalOpen, setModalOpen] = useState(false);

  if (!myTeam) return null;

  const used = myTeam.emergencyUsed;
  const emptySquad = (myTeam.squad?.length ?? 0) === 0;
  const disabled = used || emptySquad;

  return (
    <>
      <button
        onClick={() => !disabled && setModalOpen(true)}
        disabled={disabled}
        title={used ? 'Emergency Fund already used' : emptySquad ? 'No players in squad' : 'Use Emergency Fund'}
        className={`
          fixed bottom-6 right-6 z-40
          flex items-center gap-2
          px-4 py-2.5 rounded-xl
          text-sm font-semibold shadow-lg
          transition-all duration-200
          ${disabled
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-60'
            : 'bg-red-600 hover:bg-red-500 active:bg-red-700 text-white hover:shadow-red-500/30 hover:shadow-xl cursor-pointer'
          }
        `}
      >
        <span className="text-base">🚨</span>
        <span>{used ? 'Used' : 'Emergency Fund'}</span>
      </button>

      {modalOpen && <EmergencyFundModal onClose={() => setModalOpen(false)} />}
    </>
  );
}
