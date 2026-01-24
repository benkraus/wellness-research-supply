export type PosthogClient = {
  capture: (event: string, properties?: Record<string, unknown>) => void;
  identify: (distinctId: string, properties?: Record<string, unknown>) => void;
  reset: () => void;
};

export const getPosthog = (): PosthogClient | undefined => {
  if (typeof window === 'undefined') return undefined;
  return (window as typeof window & { posthog?: PosthogClient }).posthog;
};
