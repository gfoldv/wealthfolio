import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AddonContext } from '@wealthfolio/addon-sdk';
import { Icons } from '@wealthfolio/ui';
import { RealizedGainsCard } from './components/RealizedGainsCard';

const queryClient = new QueryClient();

function RealizedGainsPage({ ctx }: { ctx: AddonContext }) {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="p-6 max-w-5xl mx-auto">
        <RealizedGainsCard ctx={ctx} />
      </div>
    </QueryClientProvider>
  );
}

export default function enable(ctx: AddonContext) {
  const sidebarItem = ctx.sidebar.addItem({
    id: 'realized-gains-tracker-addon',
    label: 'Realized Gains',
    icon: <Icons.TrendingUp className="h-5 w-5" />,
    route: '/addon/realized-gains-tracker-addon',
    order: 100,
  });

  const Wrapper = () => <RealizedGainsPage ctx={ctx} />;

  ctx.router.add({
    path: '/addon/realized-gains-tracker-addon',
    component: React.lazy(() => Promise.resolve({ default: Wrapper })),
  });

  ctx.onDisable(() => {
    try {
      sidebarItem.remove();
    } catch (err) {
      ctx.api.logger.error(`Failed to remove sidebar item: ${String(err)}`);
    }
  });
}
