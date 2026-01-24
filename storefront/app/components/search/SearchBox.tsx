import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { getPosthog } from '@app/lib/posthog';
import clsx from 'clsx';
import { type ChangeEvent, type FormEvent, type RefObject, useEffect, useRef, useState } from 'react';
import { useSearchBox } from 'react-instantsearch-hooks-web';

export type SearchBoxProps = {
  placeholder?: string;
  inputRef?: RefObject<HTMLInputElement>;
  className?: string;
};

export const SearchBox = ({ placeholder, inputRef, className }: SearchBoxProps) => {
  const { query, refine, clear } = useSearchBox();
  const [value, setValue] = useState(query);
  const lastTrackedQueryRef = useRef<string | null>(null);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    setValue(event.currentTarget.value);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      refine(value);

      const trimmed = value.trim();
      if (trimmed.length < 2) return;
      if (lastTrackedQueryRef.current === trimmed) return;

      const posthog = getPosthog();
      if (!posthog) return;

      posthog.capture('search_performed', { query: trimmed });
      lastTrackedQueryRef.current = trimmed;
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [value, refine]);

  return (
    <search className={clsx('relative w-full group', className)}>
      <form onSubmit={onSubmit} noValidate action="">
        <div className="relative flex items-center">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" aria-hidden="true" />
          </div>
          <input
            ref={inputRef}
            className="block w-full rounded-xl border-0 bg-gray-50 py-4 pl-11 pr-4 text-gray-900 placeholder:text-gray-400 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6 transition-all"
            type="search"
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            maxLength={512}
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                setValue('');
                clear();
              }}
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600"
            >
              <span className="text-xs font-medium uppercase tracking-wider">Clear</span>
            </button>
          )}
        </div>
      </form>
    </search>
  );
};
