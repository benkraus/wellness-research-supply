import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useEffect, useState } from 'react';

export const AgeGateModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [birthDate, setBirthDate] = useState({ month: '', day: '', year: '' });
  const [error, setError] = useState<string | null>(null);
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false);

  useEffect(() => {
    const verified = localStorage.getItem('wrs_age_verified');
    if (verified !== 'true') {
      setIsOpen(true);
    }
    setHasCheckedStorage(true);
  }, []);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { month, day, year } = birthDate;
    
    if (!month || !day || !year) {
      setError('Please enter your full date of birth.');
      return;
    }

    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    const y = parseInt(year, 10);

    if (Number.isNaN(m) || Number.isNaN(d) || Number.isNaN(y)) {
      setError('Invalid date.');
      return;
    }

    const today = new Date();
    const birth = new Date(y, m - 1, d);
    
    let age = today.getFullYear() - birth.getFullYear();
    const mDiff = today.getMonth() - birth.getMonth();
    
    if (mDiff < 0 || (mDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    if (age >= 18) {
      localStorage.setItem('wrs_age_verified', 'true');
      setIsOpen(false);
    } else {
      setError('You must be at least 18 years old to access this site.');
    }
  };

  const handleChange = (field: 'month' | 'day' | 'year', value: string) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return;
    
    setBirthDate(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Don't render anything until we've checked local storage to avoid flash
  if (!hasCheckedStorage && !isOpen) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog 
        as="div" 
        className="relative z-[200]" 
        onClose={() => {}}
        static 
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-highlight-900/90 backdrop-blur-md" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-500"
              enterFrom="opacity-0 scale-95 translate-y-4"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl border border-primary-500/20 bg-highlight-100 p-8 text-left align-middle shadow-2xl transition-all relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent opacity-50 blur-sm" />
                
                <Dialog.Title
                  as="h3"
                  className="text-2xl font-display font-bold leading-6 text-primary-50 text-center mb-2"
                >
                  Age Verification
                </Dialog.Title>
                
                <p className="text-center text-primary-200/70 text-sm mb-8">
                  You must be 18 years or older to view this content.
                </p>

                <form onSubmit={handleVerify} className="space-y-6">
                  <div className="flex gap-3 justify-center">
                    <div className="w-20">
                      <label htmlFor="month" className="block text-xs uppercase tracking-wider text-primary-300 mb-1 text-center">Month</label>
                      <input
                        id="month"
                        type="text"
                        maxLength={2}
                        placeholder="MM"
                        className="w-full bg-highlight-200 border border-primary-900/50 rounded-lg py-3 px-2 text-center text-primary-50 placeholder-primary-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                        value={birthDate.month}
                        onChange={(e) => handleChange('month', e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="w-20">
                      <label htmlFor="day" className="block text-xs uppercase tracking-wider text-primary-300 mb-1 text-center">Day</label>
                      <input
                        id="day"
                        type="text"
                        maxLength={2}
                        placeholder="DD"
                        className="w-full bg-highlight-200 border border-primary-900/50 rounded-lg py-3 px-2 text-center text-primary-50 placeholder-primary-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                        value={birthDate.day}
                        onChange={(e) => handleChange('day', e.target.value)}
                      />
                    </div>
                    <div className="w-28">
                      <label htmlFor="year" className="block text-xs uppercase tracking-wider text-primary-300 mb-1 text-center">Year</label>
                      <input
                        id="year"
                        type="text"
                        maxLength={4}
                        placeholder="YYYY"
                        className="w-full bg-highlight-200 border border-primary-900/50 rounded-lg py-3 px-2 text-center text-primary-50 placeholder-primary-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                        value={birthDate.year}
                        onChange={(e) => handleChange('year', e.target.value)}
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-md bg-red-900/20 p-3 border border-red-500/30 animate-pulse">
                      <p className="text-sm text-red-200 text-center font-medium">
                        {error}
                      </p>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full rounded-lg bg-primary-600 px-4 py-3 text-sm font-bold text-highlight-900 hover:bg-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 transition-colors uppercase tracking-widest shadow-[0_0_15px_rgba(45,212,191,0.3)] hover:shadow-[0_0_25px_rgba(45,212,191,0.5)]"
                    >
                      Enter Site
                    </button>
                  </div>
                  
                  <p className="text-[10px] text-primary-400/50 text-center leading-relaxed">
                    By entering this site, you are agreeing to our Terms of Service and Privacy Policy. 
                    This site contains products intended for laboratory research use only.
                  </p>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
