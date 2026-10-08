import { notFound } from 'next/navigation';

/** An address no page answers, in either edition: that edition's own blank proof. */
export default function Missing(): never {
  notFound();
}
