import { Container } from '@app/components/common/container';
import { PageHeading } from '@app/components/sections/PageHeading';
import type { MetaFunction } from 'react-router';

export const meta: MetaFunction = () => {
  return [
    { title: 'Special Request Peptides | Wellness Research Supply' },
    { name: 'description', content: 'Catalog of special request peptides and compounds available for research.' },
  ];
};

type ProductVariant = {
  spec: string;
  price: string;
};

type Product = {
  name: string;
  cas?: string;
  variants: ProductVariant[];
};

type Category = {
  title: string;
  products: Product[];
};

const catalog: Category[] = [
  {
    title: 'GLP-1 & Metabolic',
    products: [
      {
        name: 'Tirzepatide',
        cas: 'CAS 2023788-19-2',
        variants: [
          { spec: '5mg', price: '$68' },
          { spec: '10mg', price: '$80' },
          { spec: '15mg', price: '$90' },
          { spec: '20mg', price: '$105' },
          { spec: '30mg', price: '$140' },
          { spec: '40mg', price: '$160' },
          { spec: '50mg', price: '$180' },
          { spec: '60mg', price: '$210' },
          { spec: '100mg', price: '$310' },
          { spec: '120mg', price: '$370' },
        ],
      },
      {
        name: 'Retatrutide',
        cas: 'CAS 2381089-83-2',
        variants: [
          { spec: '5mg', price: '$85' },
          { spec: '10mg', price: '$120' },
          { spec: '15mg', price: '$170' },
          { spec: '20mg', price: '$200' },
          { spec: '30mg', price: '$250' },
          { spec: '40mg', price: '$290' },
          { spec: '50mg', price: '$340' },
          { spec: '60mg', price: '$370' },
        ],
      },
      {
        name: 'Semaglutide',
        cas: 'CAS 910463-68-2',
        variants: [
          { spec: '5mg', price: '$70' },
          { spec: '10mg', price: '$80' },
          { spec: '15mg', price: '$90' },
          { spec: '20mg', price: '$100' },
          { spec: '30mg', price: '$135' },
        ],
      },
      {
        name: 'Cagrilintide',
        variants: [
          { spec: '5mg', price: '$100' },
          { spec: '10mg', price: '$170' },
        ],
      },
      {
        name: 'Adipotide',
        variants: [
          { spec: '2mg', price: '$90' },
          { spec: '5mg', price: '$150' },
        ],
      },
      {
        name: 'Survodutide',
        variants: [
          { spec: '2mg', price: '$110' },
          { spec: '5mg', price: '$170' },
          { spec: '10mg', price: '$300' },
        ],
      },
      {
        name: 'NAD+',
        cas: 'CAS 53-84-9',
        variants: [
          { spec: '100mg', price: '$55' },
          { spec: '500mg', price: '$80' },
          { spec: '1000mg', price: '$130' },
        ],
      },
    ],
  },
  {
    title: 'Research Peptides',
    products: [
      {
        name: 'Epithalon',
        variants: [
          { spec: '10mg', price: '$55' },
          { spec: '50mg', price: '$150' },
        ],
      },
      {
        name: 'TB500',
        variants: [
          { spec: '2mg', price: '$60' },
          { spec: '5mg', price: '$90' },
          { spec: '10mg', price: '$145' },
        ],
      },
      {
        name: 'BPC157',
        variants: [
          { spec: '5mg', price: '$60' },
          { spec: '10mg', price: '$80' },
        ],
      },
      {
        name: 'CJC-1295 (without DAC)',
        variants: [
          { spec: '2mg', price: '$55' },
          { spec: '5mg', price: '$90' },
          { spec: '10mg', price: '$155' },
        ],
      },
      {
        name: 'CJC-1295 (with DAC)',
        variants: [
          { spec: '2mg', price: '$90' },
          { spec: '5mg', price: '$155' },
        ],
      },
      {
        name: 'Melanotan-1',
        cas: 'CAS 75921-69-6',
        variants: [
          { spec: '10mg', price: '$60' },
        ],
      },
      {
        name: 'Melanotan-2',
        cas: 'CAS 121062-08-6',
        variants: [
          { spec: '10mg', price: '$60' },
        ],
      },
      {
        name: 'GHKCU',
        cas: 'CAS 49557-75-7',
        variants: [
          { spec: '50mg', price: '$50' },
          { spec: '100mg', price: '$65' },
        ],
      },
      {
        name: 'Most-c',
        variants: [
          { spec: '10mg', price: '$70' },
          { spec: '40mg', price: '$185' },
        ],
      },
      {
        name: 'SS-31',
        variants: [
          { spec: '10mg', price: '$95' },
          { spec: '30mg', price: '$200' },
          { spec: '50mg', price: '$350' },
        ],
      },
      {
        name: 'IGF-1LR3',
        cas: 'CAS 946870-92-4',
        variants: [
          { spec: '0.1mg', price: '$55' },
          { spec: '1mg', price: '$210' },
        ],
      },
      {
        name: 'IGF-DES',
        variants: [
          { spec: '2mg', price: '$70' },
        ],
      },
      {
        name: 'DSIP',
        cas: 'CAS 62568-57-4',
        variants: [
          { spec: '2mg', price: '$50' },
          { spec: '5mg', price: '$65' },
          { spec: '10mg', price: '$80' },
          { spec: '15mg', price: '$115' },
        ],
      },
      {
        name: 'LL-37',
        cas: 'CAS 597562-32-8',
        variants: [
          { spec: '5mg', price: '$110' },
        ],
      },
      {
        name: 'AICAR',
        variants: [
          { spec: '50mg', price: '$90' },
        ],
      },
      {
        name: 'PT141',
        variants: [
          { spec: '10mg', price: '$70' },
        ],
      },
      {
        name: 'Oxytocin',
        cas: 'CAS 24346-32-5',
        variants: [
          { spec: '2mg', price: '$50' },
          { spec: '5mg', price: '$80' },
        ],
      },
      {
        name: 'Kisspeptin-10',
        variants: [
          { spec: '5mg', price: '$60' },
          { spec: '10mg', price: '$90' },
        ],
      },
      {
        name: 'ARA-290',
        variants: [
          { spec: '10mg', price: '$80' },
        ],
      },
      {
        name: 'Hexarelin Acetate',
        variants: [
          { spec: '2mg', price: '$60' },
          { spec: '5mg', price: '$90' },
        ],
      },
      {
        name: 'Humanin',
        cas: 'CAS 330936-69-1',
        variants: [
          { spec: '10mg', price: '$200' },
        ],
      },
      {
        name: 'HGH Fragment 176-191',
        variants: [
          { spec: '2mg', price: '$85' },
          { spec: '5mg', price: '$105' },
        ],
      },
      {
        name: 'Tesamorelin',
        variants: [
          { spec: '2mg', price: '$70' },
          { spec: '5mg', price: '$95' },
          { spec: '10mg', price: '$160' },
        ],
      },
      {
        name: 'Ipamorelin',
        variants: [
          { spec: '2mg', price: '$45' },
          { spec: '5mg', price: '$60' },
          { spec: '10mg', price: '$90' },
        ],
      },
    ],
  },
  {
    title: 'Other Compounds & Kits',
    products: [
      {
        name: 'Semax',
        variants: [
          { spec: '5mg', price: '$60' },
          { spec: '10mg', price: '$90' },
        ],
      },
      {
        name: 'Thymalin',
        variants: [
          { spec: '10mg', price: '$80' },
          { spec: '100mg', price: '$260' },
        ],
      },
      {
        name: 'Mazdutite',
        variants: [
          { spec: '5mg', price: '$110' },
          { spec: '10mg', price: '$180' },
        ],
      },
      {
        name: 'Lipo-C',
        variants: [
          { spec: '5mg', price: '$95' },
        ],
      },
      {
        name: 'Sermorelin Acetate',
        variants: [
          { spec: '2mg', price: '$50' },
          { spec: '5mg', price: '$90' },
          { spec: '10mg', price: '$145' },
        ],
      },
      {
        name: 'AOD-9604',
        variants: [
          { spec: '5mg', price: '$95' },
          { spec: '10mg', price: '$140' },
        ],
      },
      {
        name: 'HCG',
        variants: [
          { spec: '2000iu', price: '$70' },
          { spec: '5000iu', price: '$95' },
          { spec: '10000iu', price: '$150' },
        ],
      },
      {
        name: 'Sleank',
        variants: [
          { spec: '5mg', price: '$60' },
          { spec: '11mg', price: '$90' },
        ],
      },
      {
        name: 'PEG MGF',
        variants: [
          { spec: '2mg', price: '$95' },
        ],
      },
      {
        name: 'MGF',
        variants: [
          { spec: '2mg', price: '$55' },
        ],
      },
      {
        name: 'Melatonin',
        variants: [
          { spec: '10mg', price: '$75' },
        ],
      },
      {
        name: 'GHRP-2 Acetate',
        variants: [
          { spec: '5mg', price: '$40' },
          { spec: '10mg', price: '$65' },
        ],
      },
      {
        name: 'GHRP-6 Acetate',
        variants: [
          { spec: '5mg', price: '$40' },
          { spec: '10mg', price: '$65' },
        ],
      },
      {
        name: 'Snap-8',
        variants: [
          { spec: '10mg', price: '$60' },
        ],
      },
      {
        name: 'ACE-031',
        variants: [
          { spec: '1mg', price: '$290' },
        ],
      },
      {
        name: 'BPC15710mg + GHK-CU',
        variants: [
          { spec: '70mg*10 vials', price: '$210' },
        ],
      },
      {
        name: 'Glutathione',
        variants: [
          { spec: '600mg*10 vials', price: '$75' },
          { spec: '1500mg*10 vials', price: '$110' },
        ],
      },
      {
        name: 'BPC 5mg + TB 5mg',
        variants: [
          { spec: '10mg*10 vials', price: '$110' },
        ],
      },
      {
        name: 'BPC 10mg + TB 10mg',
        variants: [
          { spec: '20mg*10 vials', price: '$185' },
        ],
      },
      {
        name: 'CJC-1295 (no DAC) + Ipamorelin 5mg/5mg',
        variants: [
          { spec: '10mg*10 vials', price: '$120' },
        ],
      },
      {
        name: 'Cagrilintide + Semaglutide (5mg+5mg)',
        variants: [
          { spec: '10mg', price: '$205' },
        ],
      },
      {
        name: '5-amino-1mq',
        variants: [
          { spec: '5mg', price: '$75' },
        ],
      },
      {
        name: 'Botulinum toxin',
        variants: [
          { spec: '100iu', price: '$140' },
        ],
      },
      {
        name: 'HMG',
        variants: [
          { spec: '75iu', price: '$75' },
        ],
      },
      {
        name: 'Pnc-27',
        variants: [
          { spec: '5mg', price: '$75' },
          { spec: '10mg', price: '$102' },
        ],
      },
      {
        name: 'KissPeptin-10', // Repeated in source data, including it as provided
        variants: [
          { spec: '5mg', price: '$60' },
          { spec: '10mg', price: '$90' },
        ],
      },
      {
        name: 'L-carnitine',
        variants: [
          { spec: '10ml', price: '$90' },
        ],
      },
      {
        name: 'KPV',
        variants: [
          { spec: '10mg', price: '$80' },
        ],
      },
      {
        name: 'VIP',
        variants: [
          { spec: '10mg', price: '$185' },
        ],
      },
      {
        name: 'Dermorphin',
        variants: [
          { spec: '5mg', price: '$55' },
          { spec: '10mg', price: '$65' },
        ],
      },
      {
        name: 'Lemon bottle',
        variants: [
          { spec: '10mg', price: '$80.00' },
        ],
      },
      {
        name: 'B12',
        variants: [
          { spec: '10ml', price: '$150' },
        ],
      },
      {
        name: 'Klow',
        variants: [
          { spec: '80mg', price: '$235' },
        ],
      },
      {
        name: 'Lipo-B',
        variants: [
          { spec: '10ml', price: '$80' },
        ],
      },
      {
        name: 'Cerebrolysin',
        variants: [
          { spec: '60mg*6 vials', price: '$80' },
        ],
      },
    ],
  },
];

export default function SpecialRequests() {
  return (
    <div className="bg-highlight-50 py-16 sm:py-24">
      <Container>
        <div className="mb-16 md:text-center max-w-4xl mx-auto">
          <PageHeading className="mb-6 !text-4xl md:!text-6xl text-primary-50">
            Special Request Peptides
          </PageHeading>
          <p className="text-lg text-primary-100 mb-8 leading-relaxed">
            We offer a wide range of specialized compounds for research purposes.
            Review our catalog below for special request items.
          </p>
          <div className="bg-highlight-100 border border-primary-900/10 rounded-xl p-6 md:p-8">
            <p className="text-primary-100 font-medium text-lg">
              Special request availability is subject to confirmation. Contact us to verify lead times and regulatory requirements.
            </p>
          </div>
        </div>

          <div className="space-y-20">
          {catalog.map((category) => (
            <section key={category.title} className="scroll-mt-24" id={category.title.toLowerCase().replace(/\s+/g, '-')}> 
              <div className="flex flex-col md:flex-row md:items-baseline md:justify-between mb-8 border-b border-primary-900/10 pb-4">
                <h2 className="text-3xl font-display font-bold text-primary-50 tracking-wide">
                  {category.title}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {category.products.map((product, idx) => (
                  <div
                    key={`${product.name}-${idx}`}
                    className="group relative bg-highlight-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 border border-primary-900/10"
                  >
                    <div className="p-6">
                      <div className="mb-4">
                        <h3 className="text-xl font-bold text-primary-50 mb-1 group-hover:text-primary-200 transition-colors">
                          {product.name}
                        </h3>
                        {product.cas && (
                          <p className="text-sm font-mono text-primary-200">
                            {product.cas}
                          </p>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div className="text-xs font-semibold uppercase tracking-wider text-primary-200 mb-2">Available Options</div>
                        {product.variants.map((variant) => (
                          <div
                            key={variant.spec}
                            className="flex items-center justify-between text-sm py-1 border-b border-dashed border-primary-900/10 last:border-0"
                          >
                            <span className="font-medium text-primary-100">
                              {variant.spec}
                            </span>
                            <span className="font-bold text-primary-50">
                              {variant.price}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-20 text-center">
          <a
            href="mailto:support@wellnessresearchsupply.com"
            className="inline-flex items-center justify-center rounded-full bg-primary-600 px-8 py-3 text-base font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-highlight-50"
          >
            Contact for Inquiries
          </a>
        </div>
      </Container>
    </div>
  );
}
