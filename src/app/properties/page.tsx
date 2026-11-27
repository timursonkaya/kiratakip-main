export const dynamic = 'force-dynamic';

import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';
import { redirect } from 'next/navigation';
import { Card, PageHeader } from '@/components/ui';
import AddForm from '@/components/AddForm';
import PropertiesTable from './PropertiesTable';

export default async function PropertiesPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  const db = getUserDb(session.id);

  const properties = await db.property.findMany({
    include: {
      _count: { select: { units: true } },
      units: {
        where: { isArchived: false },
        select: {
          owners: {
            select: {
              isPrimary: true,
              owner: { select: { id: true, name: true } },
            },
            orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
          },
        },
      },
    },
    // Artık sıralama istemcide; bu yalnızca eşit değerler için kararlı bir
    // başlangıç sırası sağlar (Array.sort stabildir).
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <PageHeader
        title="Binalar"
        action={
          <AddForm endpoint="/api/properties" title="Yeni Bina" fields={[
            { name: 'title',    label: 'Bina Adı',    required: true },
            { name: 'city',     label: 'Şehir',       placeholder: 'İstanbul' },
            { name: 'district', label: 'İlçe',        placeholder: 'Kadıköy' },
            { name: 'address',  label: 'Adres' },
            { name: 'type',     label: 'Tür', options: [
              { value: 'apartment',  label: 'Apartman' },
              { value: 'villa',      label: 'Villa'    },
              { value: 'commercial', label: 'Ticari'   },
              { value: 'mixed',      label: 'Karma'    },
            ]},
          ]} />
        }
      />
      <Card>
        <PropertiesTable properties={properties} />
      </Card>
    </div>
  );
}