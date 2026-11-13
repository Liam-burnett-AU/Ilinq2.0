import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui';

export default function NotFoundPage() {
  return (
    <div className="py-10">
      <EmptyState title="That page does not exist in iLINQ 2.0" hint="It may only be available in classic iLINQ." />
      <p className="mt-4 text-center">
        <Link to="/" className="btn-primary">
          Back to Today
        </Link>
      </p>
    </div>
  );
}
