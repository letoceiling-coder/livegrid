import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, HardHat, MapPin } from 'lucide-react';
import {
  listBuilders, createBuilder, updateBuilder, deleteBuilder,
  listDistricts, createDistrict, updateDistrict, deleteDistrict,
} from '../../api/attributes';
import type { CrmBuilder, CrmDistrict } from '../../api/types';
import ConfirmDialog from '../../components/ConfirmDialog';

// Generic attribute row editor
function AttributeRow({
  item,
  onEdit,
  onDelete,
}: {
  item: { id: number; name: string };
  onEdit: (id: number, name: string) => void;
  onDelete: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value,   setValue]   = useState(item.name);
  const [saving,  setSaving]  = useState(false);

  const save = async () => {
    if (!value.trim() || value === item.name) { setEditing(false); return; }
    setSaving(true);
    await onEdit(item.id, value.trim());
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b last:border-0 hover:bg-muted/20 transition-colors">
      {editing ? (
        <div className="flex-1 flex items-center gap-2 mr-2">
          <input
            autoFocus
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditing(false); setValue(item.name); } }}
            className="flex-1 h-8 px-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button onClick={save} disabled={saving}
            className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { setEditing(false); setValue(item.name); }}
            className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      ) : (
        <span className="text-sm flex-1">{item.name}</span>
      )}
      {!editing && (
        <div className="flex items-center gap-1">
          <button onClick={() => setEditing(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(item.id)}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function AttributeSection<T extends { id: number; name: string }>({
  title,
  icon: Icon,
  items,
  loading,
  error,
  onAdd,
  onEdit,
  onDelete,
}: {
  title: string;
  icon: React.ElementType;
  items: T[];
  loading: boolean;
  error: string;
  onAdd: (name: string) => Promise<void>;
  onEdit: (id: number, name: string) => Promise<void>;
  onDelete: (id: number) => void;
}) {
  const [input, setInput]     = useState('');
  const [adding, setAdding]   = useState(false);
  const [addErr, setAddErr]   = useState('');

  const handleAdd = async () => {
    if (!input.trim()) return;
    setAdding(true);
    setAddErr('');
    try {
      await onAdd(input.trim());
      setInput('');
    } catch (e: any) {
      setAddErr(e.message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="bg-background border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b">
        <Icon className="w-4 h-4 text-primary" />
        <h2 className="font-semibold">{title}</h2>
        <span className="ml-auto text-xs text-muted-foreground">{items.length}</span>
      </div>

      {/* Add input */}
      <div className="px-4 py-3 border-b bg-muted/10">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => { setInput(e.target.value); setAddErr(''); }}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder={`Добавить ${title.toLowerCase()}…`}
            className="flex-1 h-9 px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !input.trim()}
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            {adding ? 'Добавление…' : 'Добавить'}
          </button>
        </div>
        {addErr && <p className="text-xs text-destructive mt-1.5">{addErr}</p>}
      </div>

      {error && (
        <div className="px-4 py-3 text-destructive text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-20">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">Список пуст</div>
      ) : (
        <div>
          {items.map(item => (
            <AttributeRow key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AttributesPage() {
  const [builders,  setBuilders]  = useState<CrmBuilder[]>([]);
  const [districts, setDistricts] = useState<CrmDistrict[]>([]);
  const [bLoading,  setBLoading]  = useState(true);
  const [dLoading,  setDLoading]  = useState(true);
  const [bError,    setBError]    = useState('');
  const [dError,    setDError]    = useState('');

  const [deleteTarget, setDeleteTarget] = useState<{ type: 'builder' | 'district'; id: number } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadBuilders  = () => { setBLoading(true); listBuilders().then(r  => setBuilders(r.data)).catch(e => setBError(e.message)).finally(() => setBLoading(false)); };
  const loadDistricts = () => { setDLoading(true); listDistricts().then(r => setDistricts(r.data)).catch(e => setDError(e.message)).finally(() => setDLoading(false)); };

  useEffect(() => { loadBuilders(); loadDistricts(); }, []);

  // Builders
  const addBuilder = async (name: string) => { await createBuilder(name); loadBuilders(); };
  const editBuilder = async (id: number, name: string) => { await updateBuilder(id, name); loadBuilders(); };

  // Districts
  const addDistrict = async (name: string) => { await createDistrict(name); loadDistricts(); };
  const editDistrict = async (id: number, name: string) => { await updateDistrict(id, name); loadDistricts(); };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      if (deleteTarget.type === 'builder')  { await deleteBuilder(deleteTarget.id);  loadBuilders(); }
      if (deleteTarget.type === 'district') { await deleteDistrict(deleteTarget.id); loadDistricts(); }
      setDeleteTarget(null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Атрибуты</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Управление застройщиками и районами</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <AttributeSection
          title="Застройщики"
          icon={HardHat}
          items={builders}
          loading={bLoading}
          error={bError}
          onAdd={addBuilder}
          onEdit={editBuilder}
          onDelete={id => setDeleteTarget({ type: 'builder', id })}
        />
        <AttributeSection
          title="Районы"
          icon={MapPin}
          items={districts}
          loading={dLoading}
          error={dError}
          onAdd={addDistrict}
          onEdit={editDistrict}
          onDelete={id => setDeleteTarget({ type: 'district', id })}
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Удалить ${deleteTarget?.type === 'builder' ? 'застройщика' : 'район'}?`}
        message="Нельзя удалить, если есть связанные ЖК. Убедитесь, что атрибут не используется."
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
