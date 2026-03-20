import { ROLE_LABELS, CATEGORY_LABELS } from '../../utils/constants';

export function RoleBadge({ role, size = 'sm' }) {
  const cls = size === 'xs' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-0.5';
  return (
    <span className={`inline-flex items-center rounded-full font-medium badge-role-${role} ${cls}`}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}

export function CategoryBadge({ category, size = 'sm' }) {
  const cls = size === 'xs' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-0.5';
  return (
    <span className={`inline-flex items-center rounded-full font-medium badge-${category} ${cls}`}>
      {CATEGORY_LABELS[category] || category}
    </span>
  );
}

export function NationalityBadge({ nationality, country }) {
  const isOverseas = nationality === 'Overseas';
  return (
    <span className={`inline-flex items-center rounded-full text-xs px-2 py-0.5 font-medium ${isOverseas ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'}`}>
      {country}
    </span>
  );
}
