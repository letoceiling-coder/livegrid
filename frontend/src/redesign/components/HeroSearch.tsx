import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useSuggest } from '@/api/hooks/useSuggest';

type SuggestItem =
  | { type: 'complex'; id: string; slug: string; name: string; district: string; subway: string; image: string }
  | { type: 'metro'; id: string | number; name: string }
  | { type: 'district'; id: string | number; name: string };

export default function HeroSearch() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const results = useSuggest(q);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const onPick = (item: SuggestItem) => {
    setOpen(false);
    setQ('');
    if (item.type === 'complex') {
      if (!item.slug) return;
      navigate(`/complex/${item.slug}`);
      return;
    }
    if (item.type === 'metro' || item.type === 'district') {
      navigate(`/catalog?search=${encodeURIComponent(item.name)}`);
    }
  };

  return (
    <div ref={wrapRef} className="flex gap-2 max-w-xl mx-auto">
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Район, метро, ЖК или застройщик..."
          className="pl-10 h-12 text-sm bg-background shadow-sm"
          value={q}
          onChange={e => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              setOpen(false);
              navigate(`/catalog${q ? `?search=${encodeURIComponent(q)}` : ''}`);
            }
          }}
          autoComplete="off"
        />
        {open && q.length >= 2 && results.length > 0 && (
          <ul
            className="absolute z-50 top-full left-0 right-0 mt-1 py-1 bg-popover border border-border rounded-xl shadow-lg max-h-72 overflow-y-auto text-sm"
            role="listbox"
          >
            {(results as SuggestItem[]).map((item, i) => (
              <li key={`${item.type}-${'id' in item ? item.id : i}-${i}`} role="option">
                <button
                  type="button"
                  className={cn(
                    'w-full text-left px-3 py-2.5 hover:bg-accent transition-colors flex gap-2 items-center min-h-[44px]',
                  )}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => onPick(item)}
                >
                  {item.type === 'complex' && (
                    <>
                      <img
                        src={item.image || '/placeholder-complex.svg'}
                        alt=""
                        className="w-10 h-10 rounded-md object-cover shrink-0 bg-muted"
                      />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{item.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {[item.district, item.subway].filter(Boolean).join(' · ') || 'ЖК'}
                        </div>
                      </div>
                    </>
                  )}
                  {item.type === 'metro' && (
                    <span className="text-muted-foreground shrink-0">м.</span>
                  )}
                  {(item.type === 'metro' || item.type === 'district') && (
                    <span className="font-medium truncate">{item.name}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Link to={`/catalog${q ? `?search=${encodeURIComponent(q)}` : ''}`}>
        <Button className="h-12 px-8 shadow-sm">Найти</Button>
      </Link>
    </div>
  );
}
