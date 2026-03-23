import { useState, type KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  label?: string;
}

export default function TagsInput({ value, onChange, placeholder = 'Добавить…', label }: Props) {
  const [input, setInput] = useState('');

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput('');
  };

  const remove = (tag: string) => onChange(value.filter(t => t !== tag));

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); add(); }
    if (e.key === 'Backspace' && !input && value.length > 0) {
      remove(value[value.length - 1]);
    }
  };

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium text-foreground">{label}</p>}
      <div className="min-h-[42px] flex flex-wrap gap-1.5 p-2 rounded-xl border bg-background focus-within:ring-2 focus-within:ring-primary/30">
        {value.map(tag => (
          <span
            key={tag}
            className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-lg text-xs font-medium"
          >
            {tag}
            <button type="button" onClick={() => remove(tag)} className="hover:text-primary/60">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] outline-none bg-transparent text-sm"
        />
      </div>
      {input.trim() && (
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Plus className="w-3 h-3" /> Добавить «{input.trim()}»
        </button>
      )}
    </div>
  );
}
