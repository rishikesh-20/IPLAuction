/**
 * Per-room timer state machine.
 * State lives in memory — never persisted.
 */

const timerStates = new Map(); // roomCode -> TimerState

function createTimer(roomCode, { duration, extension, extensionThreshold, onTick, onExpire }) {
  destroyTimer(roomCode); // cleanup if any

  const state = {
    interval: null,
    secondsRemaining: duration,
    totalDuration: duration,
    isExtended: false,
    extensionAmount: extension,
    extensionThreshold,
    hasBid: false,
    startedAt: Date.now(),
    onTick,
    onExpire,
    paused: false,
    pausedAt: null,
  };

  timerStates.set(roomCode, state);
  _startInterval(roomCode);
  return state;
}

function _startInterval(roomCode) {
  const state = timerStates.get(roomCode);
  if (!state) return;

  state.interval = setInterval(() => {
    if (state.paused) return;
    state.secondsRemaining -= 1;

    state.onTick({
      secondsRemaining: state.secondsRemaining,
      totalDuration: state.totalDuration,
      isExtended: state.isExtended,
    });

    if (state.secondsRemaining <= 0) {
      clearInterval(state.interval);
      state.interval = null;
      state.onExpire({ hasBid: state.hasBid });
    }
  }, 1000);
}

/**
 * Called when a bid is placed. Resets the timer back to the original duration.
 * Returns the new secondsRemaining.
 */
function onBid(roomCode) {
  const state = timerStates.get(roomCode);
  if (!state) return null;

  state.hasBid = true;

  clearInterval(state.interval);
  state.secondsRemaining = state.totalDuration;
  state.isExtended = false;
  _startInterval(roomCode);
  return state.secondsRemaining;
}

function pauseTimer(roomCode) {
  const state = timerStates.get(roomCode);
  if (!state) return;
  state.paused = true;
  state.pausedAt = Date.now();
}

function resumeTimer(roomCode) {
  const state = timerStates.get(roomCode);
  if (!state) return;
  state.paused = false;
  state.pausedAt = null;
}

function destroyTimer(roomCode) {
  const state = timerStates.get(roomCode);
  if (state && state.interval) {
    clearInterval(state.interval);
  }
  timerStates.delete(roomCode);
}

function getTimerState(roomCode) {
  return timerStates.get(roomCode) || null;
}

module.exports = { createTimer, onBid, pauseTimer, resumeTimer, destroyTimer, getTimerState };
