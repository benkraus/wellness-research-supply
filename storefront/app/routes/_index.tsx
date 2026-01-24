import { ActionList } from '@app/components/common/actions-list/ActionList';
import { Container } from '@app/components/common/container';
import { GridCTA } from '@app/components/sections/GridCTA';
import Hero from '@app/components/sections/Hero';
import { ListItems } from '@app/components/sections/ListItems';
import ProductList from '@app/components/sections/ProductList';
import { getMergedPageMeta } from '@libs/util/page';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';

export const loader = async (args: LoaderFunctionArgs) => {
  return {};
};

export const meta: MetaFunction<typeof loader> = getMergedPageMeta;

export default function IndexRoute() {
  return (
    <>
      <Hero
        className="h-[800px] !max-w-full -mt-[calc(var(--mkt-header-height)+3rem)] md:-mt-[calc(var(--mkt-header-height-desktop)+2rem)] pt-[var(--mkt-header-height)] md:pt-[var(--mkt-header-height-desktop)]"
        content={
          <div className="text-center w-full space-y-9">
            <h4 className="font-display text-2xl tracking-widest text-primary-500">RESEARCH & LONGEVITY</h4>
            <h1 className="text-6xl md:text-8xl font-display font-bold tracking-tight text-white">
              WELLNESS<br/>RESEARCH
            </h1>
            <p className="max-w-prose mx-auto text-lg text-primary-100">
              Discover premium research compounds, crafted with clinical precision.
              Advancing the frontier of human potential.
            </p>
          </div>
        }
        actions={[
          {
            label: 'Explore Catalog',
            url: '/products',
          },
        ]}
        image={{
          url: '/assets/images/banner-lab.jpg',
          alt: 'Research Laboratory',
        }}
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(4, 27, 43, 0.9) 0%, rgba(4, 27, 43, 0.6) 50%, rgba(4, 27, 43, 0.95) 100%), url('/assets/images/banner-lab.jpg')`,
          backgroundColor: 'var(--color-dark-surface)'
        }}
      />

      <Container className="p-14 md:pt-1 lg:pt-24 relative flex flex-col items-center">
        <div className="w-full flex flex-col justify-center text-center">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mt-12 text-white">
            Precision & Purity
          </h2>
          <p className="font-display text-xl lg:text-2xl mt-6 lg:mt-8 max-w-3xl mx-auto text-primary-200">
            We are committed to providing the highest quality compounds for your research needs.
          </p>
        </div>
      </Container>

      <ListItems
        itemsClassName="mb-2"
        title="Our Commitment"
        items={[
          {
            title: 'Lab Tested',
            description:
              'Every batch is rigorously tested for purity and identity to ensure consistent results.',
          },
          {
            title: 'Research Grade',
            description:
              'Sourced from certified manufacturers to meet the strict demands of scientific research.',
          },
          {
            title: 'Secure Shipping',
            description:
              'Discrete and secure packaging ensures your research materials arrive safely.',
          },
        ]}
      />

      <ProductList
        className="!pb-[100px]"
        heading="Featured Compounds"
        actions={[
          {
            label: 'View all',
            url: '/products',
          },
        ]}
      />

      <GridCTA
        className="p-14 md:pt-28 lg:pt-24 lg:px-24"
        content={
          <div className="space-y-8 flex flex-col justify-center items-center text-center">
            <h4 className="text-xl font-display text-primary-500">ADVANCING SCIENCE</h4>
            <h3 className="text-5xl font-display font-bold text-white">INNOVATE</h3>
            <p className="text-xl text-primary-100">Push the boundaries of what is possible.</p>
            <ActionList
              actions={[
                {
                  label: 'Start Researching',
                  url: '/products',
                },
              ]}
            />
          </div>
        }
        images={[
          { src: '/assets/images/banner-lab-2.png', alt: 'Peptide Vial' },
          { src: '/assets/images/banner-lab.jpg', alt: 'Microscope' },
        ]}
        style={{
              background: 'linear-gradient(135deg, rgba(33, 207, 224, 0.1) 0%, rgba(184, 247, 174, 0.05) 100%)',
              borderRadius: '1.5rem'
        }}
      />
    </>
  );
}
