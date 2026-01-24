import { formatPrice } from '@libs/util/prices';
import { Link } from 'react-router';
import { useHits } from 'react-instantsearch-hooks-web';

interface Hit extends Record<string, unknown> {
  objectID: string;
  id: string;
  title: string;
  handle: string;
  thumbnail: string;
  variants: {
    prices: {
      amount: number;
      currency_code: string;
    }[];
  }[];
  collection?: {
    title: string;
  };
}

interface HitsProps {
  onSelect?: () => void;
}

export const Hits = ({ onSelect }: HitsProps) => {
  const { hits } = useHits<Hit>();

  const formatHitPrice = (hit: Hit) => {
    const price = hit.variants?.[0]?.prices?.[0];
    if (!price) return null;

    return formatPrice(price.amount, { currency: price.currency_code });
  };

  if (hits.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-gray-500">
        No results found. Try adjusting your search terms.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {hits.map((hit) => (
        <Link
          key={hit.objectID}
          to={`/products/${hit.handle}`}
          onClick={onSelect}
          className="group relative flex items-start gap-4 rounded-lg p-3 hover:bg-gray-50 transition-colors"
        >
          <div className="aspect-square h-20 w-20 flex-none overflow-hidden rounded-md bg-gray-100">
            {hit.thumbnail ? (
              <img
                src={hit.thumbnail}
                alt={hit.title}
                className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-400">
                <span className="text-xs">No image</span>
              </div>
            )}
          </div>
          <div className="flex-auto">
            <h4 className="font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
              {hit.title}
            </h4>
            {hit.collection && (
              <p className="text-xs text-gray-500 mt-1">{hit.collection.title}</p>
            )}
            <div className="mt-2 text-sm font-semibold text-gray-900">
              {formatHitPrice(hit) ? (
                formatHitPrice(hit)
              ) : (
                <span className="text-gray-400 text-xs">Price unavailable</span>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};
