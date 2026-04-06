import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useEntityType, useEntityTypes } from '../hooks/useEntityTypes';
import { useEntityMutations, useEntityRecord } from '../hooks/useEntityForm';
import { EntityForm } from '../components/EntityForm';
import { validateEntityForm } from '../lib/validateEntityForm';

export default function EntityFormPage() {
  const { type: typeParam, id: idParam } = useParams<{ type: string; id: string }>();
  const type = typeParam ?? '';
  const id = idParam ?? '';
  const isCreate = id === 'create';
  const navigate = useNavigate();

  const { data: types } = useEntityTypes();
  const schema = useEntityType(type, types);
  const { data: recordRes, isLoading: loadingRecord } = useEntityRecord(type, isCreate ? undefined : id);

  const { create, update } = useEntityMutations(type);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string[]> | undefined>();

  const initialValues = useMemo(() => {
    if (isCreate || !recordRes?.data) return {};
    return { ...recordRes.data.values };
  }, [isCreate, recordRes]);

  useEffect(() => {
    setValues(initialValues);
    setErrors(undefined);
  }, [initialValues]);

  const onChange = (code: string, v: unknown) => {
    setValues(prev => ({ ...prev, [code]: v }));
    setErrors(undefined);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!schema) return;
    setErrors(undefined);
    const local = validateEntityForm(schema.fields, values);
    if (local) {
      setErrors(local);
    }
    try {
      if (isCreate) {
        const res = await create.mutateAsync(values);
        navigate(`/crm2/entities/${type}/${res.data.id}`, { replace: true });
      } else {
        await update.mutateAsync({ id: Number(id), body: values });
      }
    } catch (err: unknown) {
      const ex = err as { message?: string; payload?: { errors?: Record<string, string[]> } };
      if (ex.payload?.errors) setErrors(ex.payload.errors as Record<string, string[]>);
      toast.error(ex.message || 'Не удалось сохранить');
    }
  };

  if (!schema) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Загрузка…
      </div>
    );
  }

  if (!isCreate && loadingRecord) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Загрузка записи…
      </div>
    );
  }

  const pending = create.isPending || update.isPending;

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
        <Link to={`/crm2/entities/${type}`}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Назад к списку
        </Link>
      </Button>

      <h1 className="text-2xl font-bold mb-6">
        {isCreate ? `Новая запись · ${schema.name}` : `Запись #${id} · ${schema.name}`}
      </h1>

      {!isCreate ? (
        <div className="mb-4">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link to={`/crm2/entities/${type}/${id}/history`}>История изменений</Link>
          </Button>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="max-w-4xl space-y-6">
        <EntityForm fields={schema.fields} values={values} onChange={onChange} errors={errors} disabled={pending} />

        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? 'Сохранение…' : 'Сохранить'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to={`/crm2/entities/${type}`}>Отмена</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
