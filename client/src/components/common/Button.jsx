export default function Button({ children, variant = 'primary', size = 'md', disabled, onClick, className = '', title, type = 'button', style }) {
  const base = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed';

  const sizes = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg',
  };

  const variants = {
    primary:   'bg-amber-500 hover:bg-amber-400 text-black focus:ring-amber-500',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-white focus:ring-slate-500',
    danger:    'bg-red-600 hover:bg-red-500 text-white focus:ring-red-500',
    success:   'bg-emerald-600 hover:bg-emerald-500 text-white focus:ring-emerald-500',
    ghost:     'bg-transparent hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600 focus:ring-slate-500',
    outline:   'bg-transparent border border-amber-500 text-amber-400 hover:bg-amber-500/10 focus:ring-amber-500',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={style}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
