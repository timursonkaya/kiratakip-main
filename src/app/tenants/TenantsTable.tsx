'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { UserCheck, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { DataTable, Td, TRow, Badge, EmptyState } from '@/components/ui';
import { DeleteButton } from '@/components/DeleteButton';
import { date, initial } from '@/lib/format';

type Tenant = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  createdAt: Date;
  _count: { contracts: number };
};

type SortKey = 'name' | 'phone' | 'email' | 'contracts' | 'createdAt';
type SortOrder = 'asc' | 'desc';

// Modül seviyesinde: referans sabit kalsın, gereksiz re-sort olmasın
const ACCESSORS: Record<SortKey, (t: Tenant) => string | number> = {
  name:      t => t.name,
  phone:     t => t.phone ?? '',
  email:     t => t.email ?? '',
  contracts: t => t._count.contracts,
  createdAt: t => new Date(t.createdAt).getTime(),
};

// Metin → artan, sayı/tarih → azalan (ilk tıklamada)
const DEFAULT_DIR: Record<SortKey, SortOrder> = {
  name: 'asc',
  phone: 'asc',
  email: 'asc',
  contracts: 'desc',
  createdAt: 'desc',
};

export default function TenantsTable({ tenants }: { tenants: Tenant[] }) {
  const [sort, setSort] = useState<{ key: SortKey; order: SortOrder }>({
    key: 'name',
    order: 'asc',
  });

  const sorted = useMemo(() => {
    const acc = ACCESSORS[sort.key];
    const dir = sort.order === 'asc' ? 1 : -1;

    return [...tenants].sort((a, b) => {
      const av = acc(a);
      const bv = acc(b);

      // Boş değerler (telefon/e-posta yok) her zaman en sonda
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
  }, [tenants, sort]);

  if (tenants.length === 0) {
    return (
      <EmptyState
        icon={UserCheck}
        title="Henüz kiracı yok"
        desc="Kiracı kaydı oluşturun, ardından sözleşme ile daireye bağlayın."
        action={
          <span style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 600 }}>
            Sağ üstteki "Yeni Kiracı" butonuna tıklayın
          </span>
        }
      />
    );
  }

  const toggle = (key: SortKey) =>
    setSort(prev =>
      prev.key === key
        ? { key, order: prev.order === 'asc' ? 'desc' : 'asc' }
        : { key, order: DEFAULT_DIR[key] }
    );

  const header = (label: string, key: SortKey) => {
    const active = sort.key === key;
    const nextOrder: SortOrder = active
      ? sort.order === 'asc' ? 'desc' : 'asc'
      : DEFAULT_DIR[key];
    const Icon = !active ? ArrowUpDown : sort.order === 'asc' ? ArrowUp : ArrowDown;

    return (
      <button
        type="button"
        onClick={() => toggle(key)}
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
    { label: header('Sözleşme', 'contracts'), center: true },
    { label: header('Kayıt', 'createdAt') },
    { label: '', w: 120 },
  ];

  return (
    <DataTable cols={cols}>
      {sorted.map(t => (
        <TRow key={t.id}>
          <Td>
            <Link href={`/tenants/${t.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--primary-bg)', color: 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.8125rem', fontWeight: 700,
                }}>
                  {initial(t.name)}
                </div>
                <span style={{ fontWeight: 600 }}>{t.name}</span>
              </div>
            </Link>
          </Td>
          <Td muted>{t.phone ?? '—'}</Td>
          <Td muted>{t.email ?? '—'}</Td>
          <Td center>
            <Badge variant={t._count.contracts > 0 ? 'info' : 'neutral'}>
              {t._count.contracts}
            </Badge>
          </Td>
          <Td muted>{date(t.createdAt)}</Td>
          <Td action>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
              <Link
                href={`/tenants/${t.id}/edit`}
                style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)' }}
              >
                Düzenle
              </Link>
              <DeleteButton
                endpoint={`/api/tenants/${t.id}`}
                label={t.name}
                errorAction={{ label: 'Sözleşmelere Git', href: '/contracts' }}
              />
            </div>
          </Td>
        </TRow>
      ))}
    </DataTable>
  );
}