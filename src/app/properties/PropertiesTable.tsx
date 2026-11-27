'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Building2, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { DataTable, Td, TRow, Badge, EmptyState } from '@/components/ui';
import { DeleteButton } from '@/components/DeleteButton';
import { date } from '@/lib/format';

const TYPE_LABEL: Record<string, string> = {
  apartment: 'Apartman', villa: 'Villa', commercial: 'Ticari', mixed: 'Karma',
};

type Property = {
  id: number;
  title: string;
  city: string | null;
  district: string | null;
  type: string;
  createdAt: Date;
  _count: { units: number };
  units: {
    owners: { isPrimary: boolean; owner: { id: number; name: string } }[];
  }[];
};

type SortKey = 'title' | 'owner' | 'location' | 'type' | 'units' | 'createdAt';
type SortOrder = 'asc' | 'desc';

// Aynı bina içindeki tüm dairelerin sahiplerini tekilleştir
function ownerNames(p: Property): string[] {
  return Array.from(
    new Set(p.units.flatMap(u => u.owners.map(o => o.owner.name)))
  );
}

// Modül seviyesinde: referans sabit kalsın, gereksiz re-sort olmasın
const ACCESSORS: Record<SortKey, (p: Property) => string | number> = {
  title:     p => p.title,
  owner:     p => ownerNames(p).join(', '),                         // görünen metinle aynı
  location:  p => [p.district, p.city].filter(Boolean).join(', '),  // görünen metinle aynı
  type:      p => TYPE_LABEL[p.type] ?? p.type,                     // etikete göre sırala
  units:     p => p._count.units,
  createdAt: p => new Date(p.createdAt).getTime(),
};

// Metin → artan, sayı/tarih → azalan (ilk tıklamada)
const DEFAULT_DIR: Record<SortKey, SortOrder> = {
  title: 'asc',
  owner: 'asc',
  location: 'asc',
  type: 'asc',
  units: 'desc',
  createdAt: 'desc',
};

export default function PropertiesTable({ properties }: { properties: Property[] }) {
  const [sort, setSort] = useState<{ key: SortKey; order: SortOrder }>({
    key: 'title',
    order: 'asc',
  });

  const sorted = useMemo(() => {
    const acc = ACCESSORS[sort.key];
    const dir = sort.order === 'asc' ? 1 : -1;

    return [...properties].sort((a, b) => {
      const av = acc(a);
      const bv = acc(b);

      // Boş değerler (sahibi/konumu olmayan bina) her zaman en sonda
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
  }, [properties, sort]);

  if (properties.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="Henüz bina yok"
        desc='Sağ üstteki "Yeni Bina" butonuyla ilk binanızı ekleyin. Daire eklerken sahiplerini atayabilirsiniz.'
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
    { label: header('Bina', 'title') },
    { label: header('Sahip', 'owner') },
    { label: header('Konum', 'location') },
    { label: header('Tür', 'type') },
    { label: header('Daire', 'units'), center: true },
    { label: header('Kayıt', 'createdAt') },
    { label: '', w: 120 },
  ];

  return (
    <DataTable cols={cols}>
      {sorted.map(p => {
        const names = ownerNames(p);
        const hasUnits = p._count.units > 0;
        return (
          <TRow key={p.id}>
            <Td><span style={{ fontWeight: 600 }}>{p.title}</span></Td>
            <Td muted>{names.length > 0 ? names.join(', ') : '—'}</Td>
            <Td muted>{[p.district, p.city].filter(Boolean).join(', ') || '—'}</Td>
            <Td muted>{TYPE_LABEL[p.type] ?? p.type}</Td>
            <Td center>
              <Badge variant={hasUnits ? 'info' : 'neutral'}>
                {p._count.units}
              </Badge>
            </Td>
            <Td muted>{date(p.createdAt)}</Td>
            <Td action>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                <Link
                  href={`/properties/${p.id}/edit`}
                  style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)' }}
                >
                  Düzenle
                </Link>
                <DeleteButton
                  endpoint={`/api/properties/${p.id}`}
                  label={p.title}
                  errorAction={{ label: 'Dairelere Git', href: '/units' }}
                />
              </div>
            </Td>
          </TRow>
        );
      })}
    </DataTable>
  );
}