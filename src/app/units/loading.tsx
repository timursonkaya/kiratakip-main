import { Card, TableSkeletonStandalone } from '@/components/ui';

export default function UnitsLoading() {
  return (
    <div>
      <div style={{ height: 54, marginBottom: 24 }} />
      <Card>
        <TableSkeletonStandalone cols={8} rows={8} />
      </Card>
    </div>
  );
}
