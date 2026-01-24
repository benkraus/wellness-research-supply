import { Container } from '@app/components/common/container/Container';
import { getMergedPageMeta } from '@libs/util/page';
import type { MetaFunction } from 'react-router';

export const loader = async () => {
  return {};
};

export const meta: MetaFunction<typeof loader> = getMergedPageMeta;

export default function TermsRoute() {
  return (
    <Container className="py-16 md:py-24">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12 border-b border-white/10 pb-8">
          <h1 className="text-3xl md:text-5xl font-display font-bold text-primary-50 mb-4">
            Terms of Service
          </h1>
          <p className="text-primary-200 text-lg">
            (Last updated — July 16 2025)
          </p>
        </div>

        <div className="prose prose-invert prose-lg max-w-none text-primary-100">
          <p className="lead">
            Welcome to Wellness Research Supply (“Company,” “we,” “our,” or “us”). PLEASE READ THESE TERMS OF
            SERVICE (“Terms” or “Agreement”) CAREFULLY BEFORE USING OR PURCHASING FROM THIS WEBSITE. By accessing
            or using the Site you (“Customer,” “you,” or “your”) acknowledge that you have read, understood, and
            agree to be bound by these Terms and by our Privacy Policy, incorporated by reference. If you do not
            agree, do not use the Site or purchase any products.
          </p>

          <ol>
            <li>
              <h3>Eligibility</h3>
              <p>
                You must be at least 18 years of age (21 in jurisdictions where required) and legally competent to
                enter into contracts to use this Site and purchase our products. We reserve the right to refuse or
                cancel orders that appear to be placed by minors or otherwise unqualified persons.
              </p>
            </li>
            <li>
              <h3>Research-Use-Only Products</h3>
              <p>
                All items sold by Wellness Research Supply are intended strictly for in-vitro laboratory research
                or qualified industrial use. Products are NOT medicines, dietary supplements, cosmetics, or
                veterinary drugs; they are NOT for human or animal consumption, injection, diagnostic, therapeutic,
                or other medical applications.
              </p>
            </li>
            <li>
              <h3>No Medical or Regulatory Approval</h3>
              <p>
                None of our products have been evaluated or approved by the U.S. Food &amp; Drug Administration (FDA)
                or any comparable regulatory agency. We make no express or implied claims that the products can
                diagnose, treat, cure, mitigate, or prevent any disease.
              </p>
            </li>
            <li>
              <h3>Customer Representations</h3>
              <p>By placing an order, you affirm that:</p>
              <ul>
                <li>You are a properly trained, licensed, or otherwise qualified researcher or are purchasing on behalf of such an entity.</li>
                <li>You understand the hazards associated with handling research chemicals and will follow all applicable safety and regulatory guidelines.</li>
                <li>You will not use, or allow anyone else to use, the products for human or animal consumption or any other non-research purpose.</li>
                <li>You have determined that possession and use of the products comply with all federal, state, and local laws in your jurisdiction.</li>
              </ul>
              <p>
                We may request additional proof of institutional affiliation or professional qualifications and may
                cancel any order at our sole discretion.
              </p>
            </li>
            <li>
              <h3>Ordering &amp; Payment</h3>
              <p>
                Prices are listed in U.S. dollars and are subject to change without notice. Submission of an order
                constitutes an offer to purchase; acceptance occurs only when we send a written confirmation. We
                reserve the right to limit quantities or refuse service to anyone. By submitting payment
                information, you authorize us (or our payment processor) to charge the total order amount to the
                chosen method. Late or reversed payments may result in order cancellation or account suspension.
              </p>
            </li>
            <li>
              <h3>Shipping &amp; Delivery</h3>
              <p>
                We ship Monday–Friday, excluding U.S. federal holidays. Title and risk of loss pass to you upon our
                transfer of the package to the carrier. Delivery estimates are not guaranteed. You are responsible
                for any import duties, taxes, or customs-clearance fees on international shipments.
              </p>
            </li>
            <li>
              <h3>Returns &amp; Cancellations</h3>
              <p>
                ALL SALES ARE FINAL. Because of the sensitive nature of research chemicals, we cannot accept
                returns. Order-cancellation requests may be accommodated only if the order has not yet been
                processed for shipment. To request a cancellation, email support@wellnessresearchsupply.com with
                your order number.
              </p>
            </li>
            <li>
              <h3>Prohibited Conduct</h3>
              <p>You agree not to:</p>
              <ul>
                <li>Violate any applicable law, regulation, or these Terms.</li>
                <li>Resell, distribute, or export products in violation of export-control laws.</li>
                <li>Provide misleading information during account creation or checkout.</li>
                <li>Attempt to reverse-engineer, copy, or derive proprietary data from our Site or products.</li>
                <li>Post, transmit, or otherwise make available any unlawful, harmful, or defamatory content on the Site.</li>
              </ul>
            </li>
            <li>
              <h3>Intellectual Property</h3>
              <p>
                All content on the Site—including text, graphics, logos, and code—is owned by or licensed to
                Wellness Research Supply and protected by U.S. and international intellectual-property laws. Except
                as expressly permitted, no content may be copied, reproduced, or distributed without our prior
                written consent.
              </p>
            </li>
            <li>
              <h3>Disclaimer of Warranties</h3>
              <p>
                THE SITE AND ALL PRODUCTS ARE PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTY OF ANY KIND,
                EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
                PARTICULAR PURPOSE, OR NON-INFRINGEMENT. We do not warrant that the Site will be uninterrupted or
                error-free, or that any product will meet your research requirements.
              </p>
            </li>
            <li>
              <h3>Limitation of Liability</h3>
              <p>
                IN NO EVENT SHALL WELLNESS RESEARCH SUPPLY BE LIABLE FOR ANY INDIRECT, SPECIAL, INCIDENTAL, OR
                CONSEQUENTIAL DAMAGES ARISING OUT OF OR RELATED TO THE USE OR INABILITY TO USE THE SITE OR
                PRODUCTS, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL LIABILITY SHALL NOT EXCEED
                THE AMOUNT YOU PAID FOR THE SPECIFIC PRODUCT GIVING RISE TO THE CLAIM.
              </p>
            </li>
            <li>
              <h3>Indemnification</h3>
              <p>
                You agree to indemnify, defend, and hold harmless Wellness Research Supply and its officers,
                directors, employees, and agents from any claim, demand, loss, or damage (including reasonable
                attorneys’ fees) arising out of or related to your misuse of the Site or products, your violation
                of these Terms, or your violation of any law or third-party right.
              </p>
            </li>
            <li>
              <h3>Governing Law &amp; Venue</h3>
              <p>
                This Agreement is governed by the laws of the State of Arizona, without regard to its
                conflict-of-law principles. Any dispute arising under this Agreement shall be resolved exclusively
                in the state or federal courts located in Maricopa County, Arizona, and you consent to personal
                jurisdiction and venue in those courts.
              </p>
            </li>
            <li>
              <h3>Export &amp; Regulatory Compliance</h3>
              <p>
                You are responsible for compliance with all applicable export-control regulations, sanctions
                programs, and local statutes governing the possession, use, or import of research chemicals.
              </p>
            </li>
            <li>
              <h3>Modifications to These Terms</h3>
              <p>
                We may update these Terms at any time by posting the revised version on this page. Changes become
                effective upon posting; continued use of the Site constitutes acceptance of the revised Terms.
                Review this page periodically.
              </p>
            </li>
            <li>
              <h3>Severability</h3>
              <p>
                If any provision of this Agreement is held invalid or unenforceable, the remaining provisions shall
                remain in full force and effect.
              </p>
            </li>
            <li>
              <h3>Entire Agreement</h3>
              <p>
                This Agreement, together with our Privacy Policy and any order confirmation, constitutes the entire
                agreement between you and Wellness Research Supply concerning the Site and your purchase of
                products, superseding any prior or contemporaneous communications.
              </p>
            </li>
            <li>
              <h3>Contact Us</h3>
              <p>
                Questions about these Terms or our products should be directed to:
              </p>
              <p>
                Wellness Research Supply
              </p>
              <p>
                Email: support@wellnessresearchsupply.com
              </p>
            </li>
          </ol>

          <p>
            By clicking “Place Order,” you confirm that you have read, understood, and agree to these Terms of
            Service.
          </p>
        </div>
      </div>
    </Container>
  );
}
