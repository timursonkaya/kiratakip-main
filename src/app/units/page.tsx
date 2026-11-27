export const dynamic = 'force-dynamic';

import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';
import { redirect } from 'next/navigation';
import { Card, PageHeader } from '@/components/ui';
import UnitAddForm from './UnitAddForm';
import UnitsTable from './UnitsTable';

export default async function UnitsPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  const db = getUserDb(session.id);

  const [units, properties] = await Promise.all([
    db.unit.findMany({
      include: {
        property: { select: { title: true } },
        contracts: {
          where: { status: 'active' },
          select: { tenant: { select: { name: true } }, rentAmount: true, currency: true },
          take: 1,
        },
      },
      // Sıralama artık istemcide; bu yalnızca eşit değerler için kararlı başlangıç
      orderBy: [{ propertyId: 'asc' }, { unitNo: 'asc' }],
    }),
    db.property.findMany({ select: { id: true, title: true }, orderBy: { title: 'asc' } }),
  ]);

  // Prisma Decimal istemci bileşenine serileştirilemez; sayıya çevir.
  // rentAmount zaten number/float ise bu satır zararsızdır.
  const rows = units.map(u => ({
    ...u,
    contracts: u.contracts.map(c => ({ ...c, rentAmount: Number(c.rentAmount) })),
  }));

  return (
    <div>
      <PageHeader
        title="Daireler"
        action={<UnitAddForm properties={properties} />}
      />
      <Card>
        <UnitsTable units={rows} hasProperties={properties.length > 0} />
      </Card>
    </div>
  );
}