import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Stub until favorites API / persistence is wired. */
export default function FavoritesPage() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 py-16 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
        <Heart className="w-8 h-8 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Избранное</h1>
      <p className="text-muted-foreground text-sm max-w-md mb-8">
        Здесь будут сохранённые объекты. Раздел в разработке.
      </p>
      <Button asChild variant="outline" className="rounded-full">
        <Link to="/catalog">Перейти в каталог</Link>
      </Button>
    </div>
  );
}
