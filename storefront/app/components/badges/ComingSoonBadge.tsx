import clsx from 'clsx';

export const ComingSoonBadge = ({ className }: { className?: string }) => {
  return (
    <div
      className={clsx(
        'inline-flex items-center rounded-md border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-900',
        className,
      )}
    >
      Coming soon
    </div>
  );
};
