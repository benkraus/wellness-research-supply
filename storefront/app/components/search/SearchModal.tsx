import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Fragment, useEffect, useRef } from 'react';
import { InstantSearch } from 'react-instantsearch-hooks-web';
import { ClientOnly } from 'remix-utils/client-only';

import { useStorefront } from '@app/hooks/useStorefront';
import { getPosthog } from '@app/lib/posthog';
import { SEARCH_INDEX_NAME, getSearchClient } from '@app/lib/search-client';

import { Hits } from './Hits';
import { SearchBox } from './SearchBox';

export const SearchModal = () => {
  const { state, actions } = useStorefront();
  const { toggleSearchDrawer } = actions;
  const { search } = state;
  const isOpen = Boolean(search?.open);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasTrackedOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      hasTrackedOpenRef.current = false;
      return;
    }

    if (hasTrackedOpenRef.current) return;

    const posthog = getPosthog();
    if (!posthog) return;

    posthog.capture('search_opened');
    hasTrackedOpenRef.current = true;
  }, [isOpen]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={() => toggleSearchDrawer(false)}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-primary-900/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-4 text-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all mt-[10vh]">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    Search Products
                  </Dialog.Title>
                  <button
                    type="button"
                    className="rounded-md bg-transparent text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={() => toggleSearchDrawer(false)}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <ClientOnly>
                  {() => (
                    <InstantSearch searchClient={getSearchClient()} indexName={SEARCH_INDEX_NAME}>
                      <div className="space-y-6">
                        <SearchBox inputRef={inputRef} placeholder="Search for peptides, compounds..." />
                        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                          <Hits onSelect={() => toggleSearchDrawer(false)} />
                        </div>
                      </div>
                    </InstantSearch>
                  )}
                </ClientOnly>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
