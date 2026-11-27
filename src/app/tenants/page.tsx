export const dynamic = 'force-dynamic';

import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';
import { redirect } from 'next/navigation';
import { Card, PageHeader } from '@/components/ui';
import AddForm from '@/components/AddForm';
import TenantsTable from './TenantsTable';

export default async function TenantsPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  const db = getUserDb(session.id);

  const tenants = await db.tenant.findMany({
    include: { _count: { select: { contracts: true } } },
    // Sıralama artık istemcide; bu yalnızca eşit değerler için kararlı başlangıç
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <PageHeader
        title="Kiracılar"
        action={
          <AddForm endpoint="/api/tenants" title="Yeni Kiracı" fields={[
            { name: 'name',       label: 'Ad Soyad',  required: true },
            { name: 'phone',      label: 'Telefon',   placeholder: '05xx xxx xx xx' },
            { name: 'email',      label: 'E-posta',   type: 'email' },
            { name: 'nationalId', label: 'TC Kimlik' },
            { name: 'address',    label: 'Adres' },
          ]} />
        }
      />
      <Card>
        <TenantsTable tenants={tenants} />
      </Card>
    </div>
  );
}