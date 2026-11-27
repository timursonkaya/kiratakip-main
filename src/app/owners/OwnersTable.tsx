'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Users, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { DataTable, Td, TRow, Badge, EmptyState } from '@/components/ui';
import { DeleteButton } from '@/components/DeleteButton';
import { date } from '@/lib/format';

type Owner = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  createdAt: Date;
  _count: { units: number };
};

type SortKey = 'name' | 'phone' | 'email' | 'units' | 'createdAt';
type SortOrder = 'asc' | 'desc';

// İlk tıklamada kullanılacak yön: metin → artan, sayı/tarih → azalan
const DEFAULT_DIR: Record<SortKey, SortOrder> = {
  name: 'asc',
  phone: 'asc',
  email: 'asc',
  units: 'desc',
  createdAt: 'desc',
};

function sortValue(o: Owner, key: SortKey): string | number {
  switch (key) {
    case 'name':
      return o.name;
    case 'phone':
      return o.phone ?? '';
    case 'email':
      return o.email ?? '';
    case 'units':
      return o._count.units;
    case 'createdAt':
      return new Date(o.createdAt).getTime();
  }
}

export default function OwnersTable({ owners }: { owners: Owner[] }) {
  const [sort, setSort] = useState<{ key: SortKey; order: SortOrder }>({
    key: 'name',
    order: 'asc',
  });

  const sortedOwners = useMemo(() => {
    const { key, order } = sort;
    const dir = order === 'asc' ? 1 : -1;

    return [...owners].sort((a, b) => {
      const av = sortValue(a, key);
      const bv = sortValue(b, key);

      // Boş değerler (telefon/e-posta yok) her zaman en sonda kalsın
      const aEmpty = av === '';
      const bEmpty = bv === '';
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;
      if (bEmpty) return -1;

      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * dir;
      }
      return String(av).localeCompare(String(bv), 'tr') * dir;
    });
  }, [owners, sort]);

  if (owners.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Henüz mülk sahibi yok"
        desc="Mülk sahibi kaydı oluşturarak daire yönetimine başlayın. Sahipleri daire eklerken atayabilirsiniz."
        action={
          <span style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 600 }}>
            Sağ üstteki "Yeni Mülk Sahibi" butonuna tıklayın
          </span>
        }
      />
    );
  }

  const toggleSort = (key: SortKey) =>
    setSort(prev =>
      prev.key === key
        ? { key, order: prev.order === 'asc' ? 'desc' : 'asc' }
        : { key, order: DEFAULT_DIR[key] }
    );

  const header = (label: string, key: SortKey) => {
    const active = sort.key === key;
    const nextOrder: SortOrder = active
      ? sort.order === 'asc'
        ? 'desc'
        : 'asc'
      : DEFAULT_DIR[key];
    const Icon = !active ? ArrowUpDown : sort.order === 'asc' ? ArrowUp : ArrowDown;

    return (
      <button
        type="button"
        onClick={() => toggleSort(key)}
        aria-label={`${label} sütununu ${nextOrder === 'asc' ? 'artan' : 'azalan'} sırala`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          background: 'none',
          border: 'none',
          padding: 0,
          font: 'inherit',
          color: 'inherit',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          userSelect: 'none',
        }}
      >
        {label}
        <Icon size={12} style={{ opacity: active ? 1 : 0.4 }} />
      </button>
    );
  };

  const cols = [
    { label: header('Ad Soyad', 'name') },
    { label: header('Telefon', 'phone') },
    { label: header('E-posta', 'email') },
    { label: header('Daire', 'units'), center: true },
    { label: header('Kayıt', 'createdAt') },
    { label: '', w: 120 },
  ];

  return (
    <DataTable cols={cols}>
      {sortedOwners.map(o => (
        <TRow key={o.id}>
          <Td>
            <span style={{ fontWeight: 600 }}>{o.name}</span>
          </Td>
          <Td muted>{o.phone ?? '—'}</Td>
          <Td muted>{o.email ?? '—'}</Td>
          <Td center>
            <Badge variant={o._count.units > 0 ? 'info' : 'neutral'}>
              {o._count.units}
            </Badge>
          </Td>
          <Td muted>{date(o.createdAt)}</Td>
          <Td action>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
              <Link
                href={`/owners/${o.id}/edit`}
                style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)' }}
              >
                Düzenle
              </Link>
              <DeleteButton
                endpoint={`/api/owners/${o.id}`}
                label={o.name}
                errorAction={{ label: 'Dairelere Git', href: '/units' }}
              />
            </div>
          </Td>
        </TRow>
      ))}
    </DataTable>
  );
}