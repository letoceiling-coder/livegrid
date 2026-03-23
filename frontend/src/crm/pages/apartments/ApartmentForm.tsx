import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { getApartment, createApartment, updateApartment } from '../../api/apartments';
import { listComplexes } from '../../api/complexes';
import type { CrmApartment, CrmComplex } from '../../api/types';

type FormState = {
  block_id:     string;
  number:       string;
  floor:        string;
  floors:       string;
  rooms_count:  string;
  area_total:   string;
  area_kitchen: string;
  price:        string;
  status:       string;
  plan_image:   string;
  section:      string;
  is_active:    boolean;
};

const empty: FormState = {
  block_id: '', number: '', floor: '', floors: '', rooms_count: '1',
  area_total: '', area_kitchen: '', price: '', status: 'available',
  plan_image: '', section: '', is_active: true,
};

const roomOptions = [
  { value: '0', label: 'Студия' },
  { value: '1', label: '1-комнатная' },
  { value: '2', label: '2-комнатная' },
  { value: '3', label: '3-комнатная' },
  { value: '4', label: '4-комнатная' },
  { value: '5', label: '5+ комнат' },
];

const statusOptions = [
  { value: 'available', label: 'Свободна' },
  { value: 'reserved',  label: 'Резерв' },
  { value: 'sold',      label: 'Продана' },
];

export default function ApartmentForm() {
  const { id } = useParams<{ id?: string }>();
  const isEdit  = !!id;
  const navigate = useNavigate();

  const [form,      setForm]      = useState<FormState>(empty);
  const [loading,   setLoading]   = useState(isEdit);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const [complexes, setComplexes] = useState<CrmComplex[]>([]);

  useEffect(() => {
    listComplexes({ per_page: 100 }).then(r => setComplexes(r.data)).catch(() => null);
  }, []);

  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    getApartment(id)
      .then(({ data: a }) => {
        setForm({
          block_id:     a.block_id,
          number:       a.number ?? '',
          floor:        String(a.floor),
          floors:       a.floors ? String(a.floors) : '',
          rooms_count:  String(a.rooms_count),
          area_total:   String(a.area_total),
          area_kitchen: a.area_kitchen ? String(a.area_kitchen) : '',
          price:        String(a.price),
          status:       a.status,
          plan_image:   a.plan_image ?? '',
          section:      a.section ? String(a.section) : '',
          is_active:    a.is_active,
        });
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const payload: Partial<CrmApartment> = {
      block_id:     form.block_id,
      number:       form.number || null,
      floor:        Number(form.floor),
      floors:       form.floors ? Number(form.floors) : null,
      rooms_count:  Number(form.rooms_count),
      area_total:   parseFloat(form.area_total),
      area_kitchen: form.area_kitchen ? parseFloat(form.area_kitchen) : null,
      price:        Number(form.price),
      status:       form.status,
      plan_image:   form.plan_image || null,
      section:      form.section ? Number(form.section) : null,
      is_active:    form.is_active,
    } as any;

    try {
      if (isEdit && id) {
        await updateApartment(id, payload);
      } else {
        await createApartment(payload);
      }
      navigate('/crm/apartments');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/crm/apartments')} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold">{isEdit ? 'Редактировать квартиру' : 'Новая квартира'}</h1>
          <p className="text-sm text-muted-foreground">Заполните данные квартиры</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Complex */}
        <div className="bg-background border rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Принадлежность</h2>

          <Field label="Жилой комплекс *">
            <select required value={form.block_id} onChange={e => set('block_id', e.target.value)} className="input">
              <option value="">— Выберите ЖК —</option>
              {complexes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Номер квартиры">
              <input type="text" value={form.number} onChange={e => set('number', e.target.value)} placeholder="101" className="input" />
            </Field>
            <Field label="Секция">
              <input type="number" value={form.section} onChange={e => set('section', e.target.value)} placeholder="1" min="1" className="input" />
            </Field>
          </div>
        </div>

        {/* Parameters */}
        <div className="bg-background border rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Параметры</h2>

          <Field label="Тип квартиры *">
            <select required value={form.rooms_count} onChange={e => set('rooms_count', e.target.value)} className="input">
              {roomOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Этаж *">
              <input required type="number" value={form.floor} onChange={e => set('floor', e.target.value)} placeholder="5" min="1" className="input" />
            </Field>
            <Field label="Всего этажей">
              <input type="number" value={form.floors} onChange={e => set('floors', e.target.value)} placeholder="17" min="1" className="input" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Площадь (м²) *">
              <input required type="number" step="0.1" value={form.area_total} onChange={e => set('area_total', e.target.value)} placeholder="52.5" min="1" className="input" />
            </Field>
            <Field label="Площадь кухни (м²)">
              <input type="number" step="0.1" value={form.area_kitchen} onChange={e => set('area_kitchen', e.target.value)} placeholder="12.0" min="0" className="input" />
            </Field>
          </div>
        </div>

        {/* Price & Status */}
        <div className="bg-background border rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Цена и статус</h2>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Цена (₽) *">
              <input required type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="5500000" min="0" className="input" />
            </Field>
            <Field label="Статус *">
              <select required value={form.status} onChange={e => set('status', e.target.value)} className="input">
                {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Изображение планировки (URL)">
            <input type="url" value={form.plan_image} onChange={e => set('plan_image', e.target.value)} placeholder="https://…" className="input" />
          </Field>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => set('is_active', e.target.checked)}
              className="w-4 h-4 rounded accent-primary"
            />
            <span className="text-sm font-medium">Активная (отображается на сайте)</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-8">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Сохранение…' : isEdit ? 'Сохранить изменения' : 'Добавить квартиру'}
          </button>
          <button type="button" onClick={() => navigate('/crm/apartments')}
            className="px-4 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition-colors">
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
