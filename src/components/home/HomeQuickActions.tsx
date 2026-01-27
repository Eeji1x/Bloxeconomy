import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowLeftRight, Users, Gift, Trophy, Palette } from 'lucide-react';

const actions = [
  { icon: ShoppingBag, label: 'Catalog', href: '/catalog', color: 'primary' },
  { icon: ArrowLeftRight, label: 'Trading', href: '/trading', color: 'accent' },
  { icon: Users, label: 'Users', href: '/users', color: 'secondary' },
  { icon: Gift, label: 'Promocodes', href: '/promocodes', color: 'neon-purple' },
  { icon: Trophy, label: 'Leaderboards', href: '/leaderboards', color: 'yellow-500' },
  { icon: Palette, label: 'Avatar', href: '/avatar', color: 'primary' },
];

export const HomeQuickActions = () => {
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            to={action.href}
            className="cyber-card p-4 text-center group hover:scale-105 transition-transform"
          >
            <div className={`w-12 h-12 mx-auto rounded-xl bg-${action.color}/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
              <Icon className={`w-6 h-6 text-${action.color}`} />
            </div>
            <span className="text-sm font-medium">{action.label}</span>
          </Link>
        );
      })}
    </div>
  );
};
