import { Container } from '@app/components/common/container/Container';
import { LogoStoreName } from '@app/components/LogoStoreName/LogoStoreName';
import { NewsletterSubscription } from '@app/components/newsletter/Newsletter';
import { useRootLoaderData } from '@app/hooks/useRootLoaderData';
import { useSiteDetails } from '@app/hooks/useSiteDetails';
import clsx from 'clsx';

export const Footer = () => {
  const siteDetails = useSiteDetails();
  const rootData = useRootLoaderData();
  const hasProducts = rootData?.hasPublishedProducts;

  return (
    <footer className="bg-highlight-50 min-h-[140px] py-10 text-primary-50 border-t border-primary-900/10">
      <Container>
        <div className="grid sm:grid-cols-2 lg:grid-cols-6 w-full flex-col items-center gap-8 sm:flex-row sm:items-start sm:gap-16">
          <div className="flex w-full flex-col items-center gap-8 sm:w-auto sm:items-start sm:gap-6 sm:col-span-2 lg:col-span-3">
            <div className="flex flex-col gap-5">
              <div className="h-8 w-fit">
                <LogoStoreName theme="dark" className="h-full !justify-start" />
              </div>
              <h4 className="font-bold">Research-Grade Peptides</h4>
              <p className="text-sm">
                Wellness Research Supply provides research-grade peptides and compounds.
                Manufactured and handled with a focus on purity, consistency, and documentation.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-5 lg:col-span-2">
            <NewsletterSubscription className="mb-4" />
            <div className="flex flex-col gap-2">
              <h5 className="font-bold">Contact</h5>
              <p className="text-sm text-primary-100">support@wellnessresearchsupply.com</p>
              <p className="text-sm text-primary-100">1 (800) 574-2278</p>
              <a href="/terms" className="text-sm hover:text-accent-200">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
        <div className="flex flex-col max-md:items-center gap-8 mt-8 md:flex-row md:justify-between">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col items-start gap-1 text-sm text-primary-100">
              © {new Date().getFullYear()} Wellness Research Supply
            </div>
          </div>
          <div className="mt-1 flex flex-col justify-end text-xs sm:mt-0">
            {hasProducts && null}
          </div>
        </div>
        <div className="mt-8 text-xs text-primary-100 leading-relaxed">
          By purchasing from Wellness Research Supply, the buyer acknowledges and agrees that all products are
          provided solely for lawful research use and are not intended for human or animal consumption, nor for any
          diagnostic or therapeutic procedures. The purchaser assumes full responsibility for the handling,
          storage, use, and distribution of all materials and agrees to indemnify, defend, and hold harmless
          Wellness Research Supply from any claims, damages, losses, or liabilities arising from misuse,
          unauthorized use, or failure to comply with applicable laws and regulations.
        </div>
      </Container>
    </footer>
  );
};
