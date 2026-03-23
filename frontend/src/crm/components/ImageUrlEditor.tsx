import { useState } from 'react';
import { Plus, X, Image } from 'lucide-react';

interface Props {
  value: string[];
  onChange: (urls: string[]) => void;
}

export default function ImageUrlEditor({ value, onChange }: Props) {
  const [input, setInput] = useState('');

  const add = () => {
    const url = input.trim();
    if (url && !value.includes(url)) {
      onChange([...value, url]);
    }
    setInput('');
  };

  const remove = (url: string) => onChange(value.filter(u => u !== url));

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="url"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="https://example.com/image.jpg"
          className="flex-1 h-9 px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="button"
          onClick={add}
          className="px-3 h-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {value.map((url, i) => (
            <div key={i} className="relative group rounded-xl overflow-hidden border bg-muted aspect-video">
              <img
                src={url}
                alt=""
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                <button
                  type="button"
                  onClick={() => remove(url)}
                  className="w-8 h-8 rounded-full bg-destructive flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
              {/* Fallback icon if image fails */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Image className="w-6 h-6 text-muted-foreground opacity-30" />
              </div>
            </div>
          ))}
        </div>
      )}

      {value.length === 0 && (
        <p className="text-xs text-muted-foreground">Добавьте URL изображений</p>
      )}
    </div>
  );
}
