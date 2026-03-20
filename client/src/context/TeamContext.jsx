import { createContext, useContext, useState, useCallback } from 'react';

const TeamContext = createContext(null);

export function TeamProvider({ children }) {
  const [teams, setTeams] = useState([]);
  const [myTeamId, setMyTeamId] = useState(null);

  const myTeam = teams.find((t) => t._id === myTeamId) || null;

  const setAllTeams = useCallback((newTeams) => setTeams(newTeams), []);

  const addTeam = useCallback((team) => {
    setTeams((prev) => {
      if (prev.find((t) => t._id === team._id)) return prev;
      return [...prev, team];
    });
  }, []);

  const updateTeam = useCallback((teamId, updates) => {
    setTeams((prev) =>
      prev.map((t) => (t._id?.toString() === teamId?.toString() ? { ...t, ...updates } : t))
    );
  }, []);

  const setAllTeamsFromSold = useCallback((teamsArray) => {
    setTeams(teamsArray);
  }, []);

  return (
    <TeamContext.Provider value={{ teams, myTeam, myTeamId, setMyTeamId, setAllTeams, addTeam, updateTeam, setAllTeamsFromSold }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeams() {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error('useTeams must be used within TeamProvider');
  return ctx;
}
