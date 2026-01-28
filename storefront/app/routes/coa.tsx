import { Container } from '@app/components/common/container/Container';
import { Grid } from '@app/components/common/grid/Grid';
import { GridColumn } from '@app/components/common/grid/GridColumn';
import { getMergedPageMeta } from '@libs/util/page';
import { useEffect, useMemo, useState } from 'react';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { Link, useSearchParams } from 'react-router';

export const loader = async (_args: LoaderFunctionArgs) => {
  return {};
};

export const meta: MetaFunction<typeof loader> = getMergedPageMeta;

const buildCoaUrl = (lotNumber: string) => `/api/coa/${encodeURIComponent(lotNumber)}.pdf`;

export default function CoaLookupRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [lotInput, setLotInput] = useState(() => searchParams.get('lot') ?? '');

  useEffect(() => {
    setLotInput(searchParams.get('lot') ?? '');
  }, [searchParams]);

  const activeLot = useMemo(() => (searchParams.get('lot') ?? '').trim(), [searchParams]);
  const coaUrl = useMemo(() => (activeLot ? buildCoaUrl(activeLot) : ''), [activeLot]);

  return (
    <div className="pb-24 pt-10 md:pt-16">
      <Container>
        <section className="relative overflow-hidden rounded-3xl border border-primary-200/15 bg-highlight-100/10 px-6 py-10 md:px-12 md:py-14 shadow-[0_30px_80px_-55px_rgba(45,212,191,0.65)]">
          <div className="pointer-events-none absolute -left-20 -top-16 h-64 w-64 rounded-full bg-primary-400/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 right-6 h-72 w-72 rounded-full bg-highlight-200/20 blur-3xl" />
          <div className="relative z-10 max-w-3xl">
            <p className="text-2xs uppercase tracking-[0.4em] text-primary-300">Quality Assurance</p>
            <h1 className="mt-3 text-3xl font-bold text-primary-50 sm:text-4xl lg:text-5xl">
              Certificate of Analysis Lookup
            </h1>
            <p className="mt-4 text-base text-primary-200 sm:text-lg">
              Every batch is tested and documented. Your purchase includes a lot number that links directly to the
              batch-specific Certificate of Analysis.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-primary-200">
              <div className="rounded-full border border-primary-200/25 bg-highlight-900/30 px-4 py-2">
                Individual lot traceability
              </div>
              <div className="rounded-full border border-primary-200/25 bg-highlight-900/30 px-4 py-2">
                Independent lab verification
              </div>
              <div className="rounded-full border border-primary-200/25 bg-highlight-900/30 px-4 py-2">
                COA PDF on demand
              </div>
            </div>
          </div>
        </section>

        <Grid className="mt-10 md:mt-14">
          <GridColumn className="md:col-span-4">
            <div className="h-full rounded-2xl border border-primary-200/15 bg-highlight-100/10 p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-primary-300">Step 1</p>
              <h3 className="mt-3 text-lg font-semibold text-primary-50">Batch testing</h3>
              <p className="mt-2 text-sm text-primary-200">
                Each manufacturing batch is independently tested for identity, purity, and potency.
              </p>
            </div>
          </GridColumn>
          <GridColumn className="md:col-span-4">
            <div className="h-full rounded-2xl border border-primary-200/15 bg-highlight-100/10 p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-primary-300">Step 2</p>
              <h3 className="mt-3 text-lg font-semibold text-primary-50">Lot tracking</h3>
              <p className="mt-2 text-sm text-primary-200">
                Every order includes a lot number tied to the specific batch that shipped.
              </p>
            </div>
          </GridColumn>
          <GridColumn className="md:col-span-4">
            <div className="h-full rounded-2xl border border-primary-200/15 bg-highlight-100/10 p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-primary-300">Step 3</p>
              <h3 className="mt-3 text-lg font-semibold text-primary-50">COA delivery</h3>
              <p className="mt-2 text-sm text-primary-200">
                Enter the lot number below to retrieve the matching COA PDF instantly.
              </p>
            </div>
          </GridColumn>
        </Grid>

        <Grid className="mt-12 items-start">
          <GridColumn className="md:col-span-5 lg:col-span-4">
            <div className="rounded-2xl border border-primary-200/20 bg-highlight-100/15 p-6 md:sticky md:top-24">
              <p className="text-xs uppercase tracking-[0.3em] text-primary-300">Find Your COA</p>
              <h2 className="mt-3 text-2xl font-semibold text-primary-50">Enter your lot number</h2>
              <p className="mt-2 text-sm text-primary-200">
                The lot number is printed on your vial label and order confirmation. If you need help locating it,
                contact support or reference your packing slip.
              </p>

              <form
                className="mt-6 space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const next = lotInput.trim();
                  setSearchParams(next ? { lot: next } : {});
                }}
              >
                <label className="block text-xs uppercase tracking-[0.25em] text-primary-300" htmlFor="lotNumber">
                  Lot number
                </label>
                <input
                  id="lotNumber"
                  name="lot"
                  value={lotInput}
                  onChange={(event) => setLotInput(event.target.value)}
                  placeholder="Example: WS-GLP-2409-A2"
                  className="w-full rounded-full border border-primary-200/30 bg-highlight-900/40 px-4 py-3 text-sm text-primary-50 placeholder:text-primary-300 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/30"
                />
                <button
                  type="submit"
                  className="w-full rounded-full bg-primary-500 px-5 py-3 text-sm font-semibold text-primary-900 transition hover:bg-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/40"
                >
                  Retrieve COA
                </button>
              </form>

              <p className="mt-4 text-xs text-primary-200">
                Multiple batches may be in stock for the same product, so COAs are retrieved by lot number.
              </p>
              <p className="mt-3 text-xs text-primary-200">
                Looking for product details?{' '}
                <Link to="/products" className="font-semibold text-primary-50 underline underline-offset-4">
                  Browse the catalog
                </Link>
                .
              </p>
            </div>
          </GridColumn>

          <GridColumn className="md:col-span-7 lg:col-span-8">
            <div className="rounded-2xl border border-primary-200/15 bg-highlight-900/25 p-4 md:p-6 shadow-[0_30px_80px_-60px_rgba(45,212,191,0.65)]">
              <div className="flex items-center justify-between gap-4 border-b border-primary-200/15 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-primary-300">COA Preview</p>
                  <h3 className="mt-2 text-lg font-semibold text-primary-50">
                    {activeLot ? `Lot ${activeLot}` : 'Awaiting lot number'}
                  </h3>
                </div>
                {activeLot && (
                  <span className="rounded-full border border-primary-200/30 bg-highlight-100/20 px-3 py-1 text-xs text-primary-200">
                    PDF
                  </span>
                )}
              </div>

              {activeLot ? (
                <iframe
                  key={activeLot}
                  title={`COA for lot ${activeLot}`}
                  src={coaUrl}
                  className="mt-4 h-[70vh] w-full rounded-xl border border-primary-200/20 bg-highlight-900/30"
                />
              ) : (
                <div className="mt-6 flex h-[50vh] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-primary-200/30 bg-highlight-900/30 text-center">
                  <div className="h-12 w-12 rounded-full border border-primary-200/20 bg-highlight-100/20" />
                  <p className="max-w-md text-sm text-primary-200">
                    Enter a lot number to load the matching Certificate of Analysis PDF.
                  </p>
                </div>
              )}
            </div>
          </GridColumn>
        </Grid>
      </Container>
    </div>
  );
}
