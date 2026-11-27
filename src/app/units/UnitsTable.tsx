'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { DoorOpen, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { DataTable, Td, TRow, Badge, Money, EmptyState } from '@/components/ui';
import { DeleteButton } from '@/components/DeleteButton';

const TYPE_LABEL: Record<string, string> = {
  residential: 'Konut', commercial: 'Ticari',
  parking: 'Otopark', storage: 'Depo',
};

type Unit = {
  id: number;
  unitNo: string;
  floor: number | null;
  type: string;
  status: string;
  property: { title: string };
  contracts: { tenant: { name: string }; rentAmount: number; currency: string }[];
};

type SortKey = 'unitNo' | 'property' | 'floor' | 'type' | 'status' | 'tenant' | 'rent';
type SortOrder = 'asc' | 'desc';

// Modül seviyesinde: referans sabit kalsın, gereksiz re-sort olmasın
const ACCESSORS: Record<SortKey, (u: Unit) => string | number | null> = {
  unitNo:   u => u.unitNo,
  property: u => u.property.title,
  floor:    u => u.floor,                                  // null → en sonda, 0 geçerli değer
  type:     u => TYPE_LABEL[u.type] ?? u.type,             // etikete göre sırala
  status:   u => u.status,                                 // aşağıdaki nota bakın
  tenant:   u => u.contracts[0]?.tenant.name ?? '',
  rent:     u => u.contracts[0] ? Number(u.contracts[0].rentAmount) : null,
};

// Metin → artan, sayı → azalan (ilk tıklamada)
const DEFAULT_DIR: Record<SortKey, SortOrder> = {
  unitNo: 'asc',
  property: 'asc',
  floor: 'asc',
  type: 'asc',
  status: 'asc',
  tenant: 'asc',
  rent: 'desc',
};

export default function UnitsTable({
  units,
  hasProperties,
}: {
  units: Unit[];
  hasProperties: boolean;
}) {
  const [sort, setSort] = useState<{ key: SortKey; order: SortOrder }>({
    key: 'unitNo',
    order: 'asc',
  });

  const sorted = useMemo(() => {
    const acc = ACCESSORS[sort.key];
    const dir = sort.order === 'asc' ? 1 : -1;

    return [...units].sort((a, b) => {
      const av = acc(a);
      const bv = acc(b);

      // Boş değerler (kiracısı/katı/kira bilgisi olmayan daire) her zaman en sonda
      const aEmpty = av == null || av === '';
      const bEmpty = bv == null || bv === '';
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;
      if (bEmpty) return -1;

      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * dir;
      }
      // numeric: true → "D-2" < "D-10" (aksi halde "D-10" önce gelir)
      return String(av).localeCompare(String(bv), 'tr', { numeric: true }) * dir;
    });
  }, [units, sort]);

  if (units.length === 0) {
    return (
      <EmptyState
        icon={DoorOpen}
        title="Henüz daire yok"
        desc={hasProperties
          ? 'Sağ üstteki "Yeni Daire" butonuyla ilk daireyi ekleyin.'
          : 'Daire ekleyebilmek için önce bir bina kaydı oluşturmanız gerekiyor.'}
        action={hasProperties ? undefined : (
          <Link
            href="/properties"
            style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}
          >
            Binalara Git →
          </Link>
        )}
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
    { label: header('Bina', 'property') },
    { label: header('Daire No', 'unitNo') },
    { label: header('Kat', 'floor') },
    { label: header('Tür', 'type') },
    { label: header('Durum', 'status') },
    { label: header('Kiracı', 'tenant') },
    { label: header('Kira', 'rent'), right: true },
    { label: '', w: 120 },
  ];

  return (
    <DataTable cols={cols}>
      {sorted.map(u => {
        const contract = u.contracts[0];
        return (
          <TRow key={u.id}>
            <Td muted>{u.property.title}</Td>
            <Td><span style={{ fontWeight: 600 }}>{u.unitNo}</span></Td>
            <Td muted>{u.floor != null ? `${u.floor}. Kat` : '—'}</Td>
            <Td muted>{TYPE_LABEL[u.type] ?? u.type}</Td>
            <Td><Badge status={u.status} /></Td>
            <Td>{contract?.tenant.name ?? <span style={{ color: 'var(--subtle)' }}>—</span>}</Td>
            <Td right>
              {contract
                ? <Money amount={contract.rentAmount} />
                : <span style={{ color: 'var(--subtle)' }}>—</span>}
            </Td>
            <Td action>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                <Link
                  href={`/units/${u.id}/edit`}
                  style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)' }}
                >
                  Düzenle
                </Link>
                <DeleteButton
                  endpoint={`/api/units/${u.id}`}
                  label={`${u.property.title} — ${u.unitNo}`}
                  errorAction={{ label: 'Sözleşmelere Git', href: '/contracts' }}
                />
              </div>
            </Td>
          </TRow>
        );
      })}
    </DataTable>
  );
}