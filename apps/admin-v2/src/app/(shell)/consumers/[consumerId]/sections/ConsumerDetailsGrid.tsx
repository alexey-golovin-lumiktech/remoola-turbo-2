import { type ConsumerPageData } from '../page.loader';
import { renderObject } from '../preview-helpers';

export function ConsumerDetailsGrid({ consumer }: { consumer: ConsumerPageData[`consumer`] }) {
  return (
    <section className="detailGrid">
      <article className="panel">
        <h2>Personal details</h2>
        {renderObject(consumer.personalDetails, [`firstName`, `lastName`, `legalStatus`, `citizenOf`, `phoneNumber`])}
      </article>
      <article className="panel">
        <h2>Organization details</h2>
        {renderObject(consumer.organizationDetails, [`name`, `consumerRole`, `size`])}
      </article>
      <article className="panel">
        <h2>Address</h2>
        {renderObject(consumer.addressDetails, [`street`, `city`, `state`, `country`, `postalCode`])}
      </article>
    </section>
  );
}
