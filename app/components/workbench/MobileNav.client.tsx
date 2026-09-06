import { useStore } from '@nanostores/react';
import { computed } from 'nanostores';
import { memo } from 'react';
import { workbenchStore, type WorkbenchViewType } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';

/*
 * Replit-style persistent bottom tab bar for small viewports. Instead of a
 * sliding overlay you open/close with an X, the workbench is just one of a
 * fixed set of full-screen destinations (Chat / Code / Preview) that stays
 * on screen the whole time, like Replit's mobile app.
 */

type MobileTab = 'chat' | WorkbenchViewType;

const TABS: Array<{ id: MobileTab; label: string; icon: string }> = [
  { id: 'chat', label: 'Chat', icon: 'i-ph:chat-circle-text' },
  { id: 'code', label: 'Code', icon: 'i-ph:code' },
  { id: 'preview', label: 'Preview', icon: 'i-ph:browser' },
];

export const MobileNav = memo(() => {
  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const currentView = useStore(workbenchStore.currentView);
  const hasPreview = useStore(computed(workbenchStore.previews, (previews) => previews.length > 0));

  // 'diff' has no tab of its own — it's reached from inside the Code tab, so treat it as 'code' for highlighting purposes.
  const activeTab: MobileTab = !showWorkbench ? 'chat' : currentView === 'diff' ? 'code' : currentView;

  const selectTab = (tab: MobileTab) => {
    if (tab === 'chat') {
      workbenchStore.showWorkbench.set(false);
      return;
    }

    workbenchStore.showWorkbench.set(true);
    workbenchStore.currentView.set(tab);
  };

  return (
    <nav
      className={classNames(
        'lg:hidden fixed bottom-0 left-0 right-0 z-workbench',
        'flex items-stretch',
        'bg-bolt-elements-background-depth-1 border-t border-bolt-elements-borderColor',
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      {TABS.map(({ id, label, icon }) => {
        const disabled = id === 'preview' && !hasPreview;
        const isActive = activeTab === id;

        return (
          <button
            key={id}
            disabled={disabled}
            onClick={() => selectTab(id)}
            className={classNames(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-2',
              'text-bolt-elements-textTertiary transition-colors',
              {
                'text-accent-500': isActive,
                'opacity-40': disabled,
              },
            )}
          >
            <div className={classNames(icon, 'text-xl')} />
            <span className="text-[11px] leading-none">{label}</span>
          </button>
        );
      })}
    </nav>
  );
});
