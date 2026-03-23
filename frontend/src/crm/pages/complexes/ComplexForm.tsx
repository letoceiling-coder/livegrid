import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { getComplex, createComplex, updateComplex } from '../../api/complexes';
import { listBuilders, listDistricts } from '../../api/attributes';
import type { CrmComplex, CrmBuilder, CrmDistrict } from '../../api/types';
import MapPicker from '../../components/MapPicker';
import TagsInput from '../../components/TagsInput';
import ImageUrlEditor from '../../components/ImageUrlEditor';

const statusOptions = [
  { value: 'selling',   label: 'Продажи' },
  { value: 'building',  label: 'Строится' },
  { value: 'completed', label: 'Сдан' },
  { value: 'planned',   label: 'Проект' },
];

type FormState = {
  name: string;
  builder_id: string;
  district_id: string;
  address: string;
  lat: number | null;
  lng: number | null;
  status: string;
  deadline: string;
  description: string;
  images: string[];
  advantages: string[];
  infrastructure: string[];
  seo_title: string;
  seo_description: string;
};

const empty: FormState = {
  name: '', builder_id: '', district_id: '', address: '',
  lat: null, lng: null, status: 'selling', deadline: '',
  description: '', images: [], advantages: [], infrastructure: [],
  seo_title: '', seo_description: '',
};

export default function ComplexForm() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [form,     setForm]     = useState<FormState>(empty);
  const [loading,  setLoading]  = useState(isEdit);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [builders, setBuilders] = useState<CrmBuilder[]>([]);
  const [districts, setDistricts] = useState<CrmDistrict[]>([]);

  useEffect(() => {
    listBuilders().then(r  => setBuilders(r.data)).catch(() => null);
    listDistricts().then(r => setDistricts(r.data)).catch(() => null);
  }, []);

  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    getComplex(id)
      .then(({ data: c }) => {
        setForm({
          name:           c.name,
          builder_id:     c.builder_id  ? String(c.builder_id)  : '',
          district_id:    c.district_id ? String(c.district_id) : '',
          address:        c.address   ?? '',
          lat:            c.lat ?? null,
          lng:            c.lng ?? null,
          status:         c.status ?? 'selling',
          deadline:       c.deadline ?? '',
          description:     c.description ?? '',
          images:          c.images ?? [],
          advantages:      c.advantages ?? [],
          infrastructure:  c.infrastructure ?? [],
          seo_title:       (c as any).seo_title ?? '',
          seo_description: (c as any).seo_description ?? '',
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

    const payload: Partial<CrmComplex> = {
      name:           form.name,
      builder_id:     form.builder_id  ? Number(form.builder_id)  : null,
      district_id:    form.district_id || null,
      address:        form.address || null,
      lat:            form.lat,
      lng:            form.lng,
      status:         form.status,
      deadline:       form.deadline || null,
      description:    form.description || null,
      images:          form.images,
      advantages:      form.advantages,
      infrastructure:  form.infrastructure,
      seo_title:       form.seo_title || null,
      seo_description: form.seo_description || null,
    } as any;

    try {
      if (isEdit && id) {
        await updateComplex(id, payload);
      } else {
        await createComplex(payload);
      }
      navigate('/crm/complexes');
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
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/crm/complexes')} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold">{isEdit ? 'Редактировать ЖК' : 'Новый ЖК'}</h1>
          <p className="text-sm text-muted-foreground">{isEdit ? form.name : 'Заполните данные'}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <div className="bg-background border rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Основная информация</h2>

          <Field label="Название ЖК *">
            <input
              required
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="ЖК «Название»"
              className="input"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Застройщик">
              <select value={form.builder_id} onChange={e => set('builder_id', e.target.value)} className="input">
                <option value="">— Не выбран —</option>
                {builders.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            <Field label="Район">
              <select value={form.district_id} onChange={e => set('district_id', e.target.value)} className="input">
                <option value="">— Не выбран —</option>
                {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Статус">
              <select value={form.status} onChange={e => set('status', e.target.value)} className="input">
                {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Срок сдачи">
              <input
                type="text"
                value={form.deadline}
                onChange={e => set('deadline', e.target.value)}
                placeholder="напр. III кв. 2025"
                className="input"
              />
            </Field>
          </div>

          <Field label="Адрес">
            <input
              type="text"
              value={form.address}
              onChange={e => set('address', e.target.value)}
              placeholder="Улица, дом"
              className="input"
            />
          </Field>
        </div>

        {/* Map picker */}
        <div className="bg-background border rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Координаты на карте</h2>
          <MapPicker
            lat={form.lat}
            lng={form.lng}
            onChange={(lat, lng) => setForm(f => ({ ...f, lat, lng }))}
          />
        </div>

        {/* Description */}
        <div className="bg-background border rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Описание</h2>
          <Field label="Текст">
            <textarea
              rows={5}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Описание комплекса…"
              className="input resize-y min-h-[100px]"
            />
          </Field>
        </div>

        {/* Images */}
        <div className="bg-background border rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Изображения</h2>
          <ImageUrlEditor value={form.images} onChange={v => set('images', v)} />
        </div>

        {/* Tags */}
        <div className="bg-background border rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Теги и инфраструктура</h2>
          <TagsInput
            label="Преимущества"
            value={form.advantages}
            onChange={v => set('advantages', v)}
            placeholder="Паркинг, детский сад…"
          />
          <TagsInput
            label="Инфраструктура"
            value={form.infrastructure}
            onChange={v => set('infrastructure', v)}
            placeholder="Школа, магазин…"
          />
        </div>

        {/* SEO */}
        <div className="bg-background border rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">SEO</h2>
          <Field label="SEO Title">
            <input
              type="text"
              value={form.seo_title}
              onChange={e => set('seo_title', e.target.value)}
              placeholder="Заголовок страницы для поисковиков"
              className="input"
              maxLength={255}
            />
          </Field>
          <Field label="SEO Description">
            <textarea
              rows={3}
              value={form.seo_description}
              onChange={e => set('seo_description', e.target.value)}
              placeholder="Мета-описание для поисковиков"
              className="input resize-y"
              maxLength={500}
            />
          </Field>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-8">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Сохранение…' : isEdit ? 'Сохранить изменения' : 'Создать ЖК'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/crm/complexes')}
            className="px-4 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition-colors"
          >
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
