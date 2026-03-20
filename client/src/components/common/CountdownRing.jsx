export default function CountdownRing({ secondsRemaining, totalDuration, size = 120 }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, secondsRemaining / Math.max(totalDuration, 1));
  const dashOffset = circumference * (1 - progress);

  const color = secondsRemaining <= 5
    ? '#ef4444'   // red
    : secondsRemaining <= 15
    ? '#f59e0b'   // amber
    : '#22c55e';  // green

  const isUrgent = secondsRemaining <= 5 && secondsRemaining > 0;

  return (
    <div className={`relative inline-flex items-center justify-center ${isUrgent ? 'animate-pulse-fast' : ''}`}
         style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#1e293b" strokeWidth={8}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold tabular-nums" style={{ color }}>
          {secondsRemaining}
        </span>
      </div>
    </div>
  );
}
