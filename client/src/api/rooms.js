import api from './axios';

export const createRoom = (data) => api.post('/rooms', data);
export const getRoom = (roomCode) => api.get(`/rooms/${roomCode}`);
export const updateRoomConfig = (roomCode, data) => api.patch(`/rooms/${roomCode}/config`, data);
export const getRoomHistory = (roomCode) => api.get(`/rooms/${roomCode}/history`);
export const getRoomStandings = (roomCode) => api.get(`/rooms/${roomCode}/standings`);
export const getRoomTeams = (roomCode) => api.get(`/rooms/${roomCode}/teams`);
export const setTeamPlaying11 = (teamId, data) => api.patch(`/teams/${teamId}/playing11`, data);
