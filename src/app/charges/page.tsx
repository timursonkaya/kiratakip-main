'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { RefreshCw, Receipt, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

type Owner = { id: number; name: string };
import {
  Card, PageHeader, DataTable, Td, TRow,
  Badge, Money, Btn, EmptyState, TableSkeleton,
  toast,
} from '@/components/ui';
import { DeleteButton } from '@/components/DeleteButton';
import { PaymentModal } from '@/components/PaymentModal';
import { month, date } from '@/lib/format';

type Charge = {
  id: number; status: string;
  chargeAmount: string; paidAmount: string;
  dueDate: string; periodStart: string;
  tenant: { name: string };
  unit: { unitNo: string; property: { title: string } };
  contract: { currency: string };
  exchangeRate:    number | null;
  chargeAmountTry: number | null;
};

type SortKey = 'tenant' | 'unit' | 'period' | 'dueDate' | 'amount' | 'paid' | 'balance' | 'status';
type SortOrder = 'asc' | 'desc';

// Modül seviyesinde: referans sabit kalsın, gereksiz re-sort olmasın
const ACCESSORS: Record<SortKey, (c: Charge) => string | number> = {
  tenant:  c => c.tenant.name,
  // Bina + daire birlikte: aynı binadakiler gruplanır, daire no numerik sıralanır
  unit:    c => `${c.unit.property.title} ${c.unit.unitNo}`,
  period:  c => new Date(c.periodStart).getTime(),
  dueDate: c => new Date(c.dueDate).getTime(),
  // Görünen tutarla aynı: TRY karşılığı varsa o, yoksa orijinal
  amount:  c => c.chargeAmountTry ?? Number(c.chargeAmount),
  paid:    c => Number(c.paidAmount),
  // Hücredeki "Kalan" ile aynı hesap (negatife düşmesin)
  balance: c => Math.max(0, Number(c.chargeAmount) - Number(c.paidAmount)),
  status:  c => c.status,
};

// Metin → artan, sayı/tarih → azalan (ilk tıklamada)
const DEFAULT_DIR: Record<SortKey, SortOrder> = {
  tenant:  'asc',
  unit:    'asc',
  period:  'desc',
  dueDate: 'asc',   // en eski vade önce → gecikmiş olanlar üstte
  amount:  'desc',
  paid:    'desc',
  balance: 'desc',
  status:  'asc',
};

export default function ChargesPage() {
  const [charges,    setCharges]    = useState<Charge[]>([]);
  const [filter,     setFilter]     = useState('');
  const [ownerId,    setOwnerId]    = useState('');
  const [owners,     setOwners]     = useState<Owner[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [generating, setGenerating] = useState(false);

  // Varsayılan: vade artan (gecikmiş alacaklar üstte)
  const [sort, setSort] = useState<{ key: SortKey; order: SortOrder }>({
    key: 'dueDate',
    order: 'asc',
  });

  const [payModal, setPayModal] = useState<{ chargeId: number; remaining: number; label: string } | null>(null);

  const sortedCharges = useMemo(() => {
    const acc = ACCESSORS[sort.key];
    const dir = sort.order === 'asc' ? 1 : -1;

    return [...charges].sort((a, b) => {
      const av = acc(a);
      const bv = acc(b);

      // Boş değerler her zaman en sonda
      const aEmpty = av == null || av === '';
      const bEmpty = bv == null || bv === '';
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;
      if (bEmpty) return -1;

      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * dir;
      }
      // numeric: true → "D-2" < "D-10"
      return String(av).localeCompare(String(bv), 'tr', { numeric: true }) * dir;
    });
  }, [charges, sort]);

  useEffect(() => {
    fetch('/api/owners').then(r => r.json()).then(setOwners).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter)  params.set('status',  filter);
    if (ownerId) params.set('ownerId', ownerId);
    const qs  = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`/api/charges${qs}`);
    setCharges(await res.json());
    setLoading(false);
  }, [filter, ownerId]);

  useEffect(() => { load(); }, [load]);

  async function generate() {
    setGenerating(true);
    try {
      const res = await fetch('/api/charges?action=generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: new Date().toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Hata');
      toast.success(`${data.created} alacak oluşturuldu`);
      await load();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  function openModal(chargeId: number, remaining: number, label: string) {
    setPayModal({ chargeId, remaining, label });
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
      ? (sort.order === 'asc' ? 'desc' : 'asc')
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
    { label: header('Kiracı', 'tenant')              },
    { label: header('Daire', 'unit'),        w: 160  },
    { label: header('Dönem', 'period'),      w: 80   },
    { label: header('Vade', 'dueDate'),      w: 96   },
    { label: header('Tutar', 'amount'),      right: true, w: 120 },
    { label: header('Ödenen', 'paid'),       right: true, w: 102 },
    { label: header('Kalan', 'balance'),     right: true, w: 102 },
    { label: header('Durum', 'status'),      w: 90   },
    { label: '',                             w: 200  },
  ];

  return (
    <>
      <PageHeader
        title="Alacaklar"
        desc="Kira alacakları ve ödemeler"
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {owners.length > 1 && (
              <select
                value={ownerId}
                onChange={e => setOwnerId(e.target.value)}
                style={{ width: 'auto', minWidth: 160 }}
                aria-label="Sahip filtresi"
              >
                <option value="">Tüm Sahipler</option>
                {owners.map(o => (
                  <option key={o.id} value={String(o.id)}>{o.name}</option>
                ))}
              </select>
            )}
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{ width: 'auto', minWidth: 148 }}
              aria-label="Durum filtresi"
            >
              <option value="">Tüm Durumlar</option>
              <option value="pending">Bekliyor</option>
              <option value="partial">Kısmi Ödendi</option>
              <option value="overdue">Gecikti</option>
              <option value="paid">Ödendi</option>
              <option value="waived">İptal Edildi</option>
            </select>
            <Btn onClick={generate} disabled={generating}>
              <RefreshCw
                size={14}
                style={generating ? { animation: 'spin 1s linear infinite' } : undefined}
              />
              {generating ? 'Oluşturuluyor...' : 'Alacak Oluştur'}
            </Btn>
          </div>
        }
      />

      <Card>
        {loading ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody><TableSkeleton cols={9} rows={6} /></tbody>
          </table>
        ) : charges.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={filter ? 'Bu filtreye ait alacak yok' : 'Henüz alacak kaydı yok'}
            desc={filter ? 'Farklı bir durum filtresi deneyin.' : 'Aktif sözleşmeleriniz için yukarıdaki "Alacak Oluştur" butonuna tıklayın.'}
            action={!filter
              ? <Link href="/contracts" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>Sözleşmelere Git →</Link>
              : undefined}
          />
        ) : (
          <DataTable cols={cols}>
            {sortedCharges.map(c => {
              const balance = Math.max(0, Number(c.chargeAmount) - Number(c.paidAmount));
              const canPay  = ['pending', 'partial', 'overdue'].includes(c.status);
              return (
                <TRow key={c.id}>
                  <Td truncate><span style={{ fontWeight: 600 }}>{c.tenant.name}</span></Td>
                  <Td muted truncate>{c.unit.property.title} · {c.unit.unitNo}</Td>
                  <Td muted>{month(c.periodStart)}</Td>
                  <Td muted>{date(c.dueDate)}</Td>
                  <Td right>
                    {c.chargeAmountTry != null && c.exchangeRate != null ? (
                      <div style={{ textAlign: 'right' }}>
                        <Money amount={c.chargeAmountTry} />
                        <div style={{
                          fontSize: '0.7rem', color: 'var(--subtle)', marginTop: 2,
                          fontFamily: 'ui-monospace, monospace',
                        }}>
                          {Number(c.chargeAmount).toLocaleString('tr-TR')} {c.contract.currency}
                          {' @ '}{c.exchangeRate.toLocaleString('tr-TR', { minimumFractionDigits: 4 })}
                        </div>
                      </div>
                    ) : (
                      <Money amount={c.chargeAmount} />
                    )}
                  </Td>
                  <Td right>
                    <span style={{ fontFamily: 'ui-monospace,monospace', fontWeight: 600, color: 'var(--green)' }}>
                      ₺{Number(c.paidAmount).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </Td>
                  <Td right>
                    {balance > 0
                      ? <span style={{ fontFamily: 'ui-monospace,monospace', fontWeight: 700, color: c.status === 'overdue' ? 'var(--red)' : 'var(--text)' }}>
                          ₺{balance.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      : <span style={{ color: 'var(--subtle)' }}>—</span>}
                  </Td>
                  <Td><Badge status={c.status} /></Td>
                  <Td action>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', padding: '0 8px' }}>
                      {canPay && (
                        <button
                          onClick={() => openModal(c.id, balance, `${c.tenant.name} — ${c.unit.property.title} · ${c.unit.unitNo}`)}
                          aria-label={`${c.tenant.name} için ödeme al`}
                          style={{
                            height: 30, padding: '0 14px', borderRadius: 6,
                            fontSize: '0.8125rem', fontWeight: 600,
                            background: 'var(--primary)', color: '#fff',
                            border: 'none', cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.12s',
                          }}
                        >
                          Ödeme Al
                        </button>
                      )}
                      <DeleteButton
                        endpoint={`/api/charges/${c.id}`}
                        label={`${c.tenant.name} — ${c.unit.unitNo}`}
                        onDeleted={load}
                        warningText="Alacak silinir. Ödeme kaydı olan alacaklar silinemez."
                      />
                    </div>
                  </Td>
                </TRow>
              );
            })}
          </DataTable>
        )}
      </Card>

      {payModal && (
        <PaymentModal
          open={!!payModal}
          onClose={() => setPayModal(null)}
          onSuccess={load}
          endpoint={`/api/charges/${payModal.chargeId}/payments`}
          remaining={payModal.remaining}
          label={payModal.label}
        />
      )}
    </>
  );
}