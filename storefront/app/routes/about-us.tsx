import { Container } from '@app/components/common/container';
import Hero from '@app/components/sections/Hero';
import { getMergedPageMeta } from '@libs/util/page';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';

export const loader = async (args: LoaderFunctionArgs) => {
  return {};
};

export const meta: MetaFunction<typeof loader> = getMergedPageMeta;

export default function IndexRoute() {
  return (
    <>
      <Container className="!px-0 py-0 sm:!p-16">
        <Hero
          className="min-h-[400px] !max-w-full bg-highlight-50 bg-[radial-gradient(120%_120%_at_10%_10%,rgba(33,207,224,0.18)_0%,rgba(47,230,197,0.10)_40%,rgba(4,27,43,1)_75%)] sm:rounded-3xl p-6 sm:p-10 md:p-[88px] md:px-[88px]"
          content={
            <div className="text-center w-full space-y-9">
              <h4 className="text-lg md:text-2xl font-display tracking-wider">ABOUT US</h4>
              <h1 className="text-4xl md:text-8xl font-display tracking-wider [text-shadow:_1px_1px_2px_rgb(0_0_0_/_40%)]">
                Our Mission
              </h1>
              <p className="mx-auto text-md md:text-2xl !leading-normal">
                At Wellness Research Supply, we are dedicated to advancing the frontier of human potential.
                We provide premium, lab-tested compounds for research and development.
                Our commitment to quality ensures that every product meets the highest standards of purity and precision.
              </p>
            </div>
          }
          actionsClassName="!flex-row w-full justify-center !font-base"
          actions={[
            {
              label: 'Browse Catalog',
              url: '/products',
            },
          ]}
        />
      </Container>
    </>
  );
}
