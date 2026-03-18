import { useState } from 'react';
import { cn } from '@/lib/utils';
import catHouses from '@/assets/cat-houses.png';
import catApartments from '@/assets/cat-apartments.png';
import catPlots from '@/assets/cat-plots.png';
import catParking from '@/assets/cat-parking.png';
import catCommercial from '@/assets/cat-commercial.png';
import catSearch from '@/assets/cat-search.png';

const propertyTypes = [
  { label: 'Частный дом', image: catHouses },
  { label: 'Квартира', image: catApartments },
  { label: 'Участок', image: catPlots },
  { label: 'Паркинг', image: catParking },
  { label: 'Коммерческая', image: catCommercial },
  { label: 'Другое', image: catSearch },
];

const goals = ['Для проживания', 'Инвестиция', 'Сдача в аренду', 'Бизнес'];
const budgets = ['До 3 млн', '3–7 млн', '7–15 млн', '15–30 млн', '30+ млн'];

const QuizSection = () => {
  const [step, setStep] = useState(0);
  const [selectedTypes, setSelectedTypes] = useState<number[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<number | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<number | null>(null);

  const toggleType = (i: number) => {
    setSelectedTypes(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };

  const canNext = step === 0 ? selectedTypes.length > 0 : step === 1 ? selectedGoal !== null : selectedBudget !== null;

  return (
    <section className="py-6 sm:py-8">
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Quiz Card */}
          <div className="flex-1 bg-secondary rounded-2xl p-4 sm:p-6 md:p-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Подберем объект под Ваш запрос</h2>

            {step === 0 && (
              <>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">Какой тип недвижимости рассматриваете?</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
                  {propertyTypes.map((pt, i) => (
                    <button
                      key={i}
                      onClick={() => toggleType(i)}
                      className={cn(
                        "relative rounded-xl border-2 p-3 sm:p-4 text-left transition-all min-h-[100px] sm:min-h-[120px] overflow-hidden touch-manipulation",
                        selectedTypes.includes(i)
                          ? "border-primary bg-accent"
                          : "border-border bg-background hover:border-primary/30 active:border-primary/50"
                      )}
                    >
                      <span className="font-medium text-xs sm:text-sm relative z-10 leading-tight">{pt.label}</span>
                      <div className={cn(
                        "absolute bottom-2 sm:bottom-3 left-2 sm:left-3 w-4 h-4 sm:w-5 sm:h-5 rounded border-2 flex items-center justify-center z-10",
                        selectedTypes.includes(i) ? "bg-primary border-primary" : "border-border bg-background"
                      )}>
                        {selectedTypes.includes(i) && (
                          <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <img src={pt.image} alt={pt.label} className="absolute bottom-0 right-0 w-16 h-16 sm:w-20 sm:h-20 object-contain opacity-80" />
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">Какая цель приобретения?</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
                  {goals.map((g, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedGoal(i)}
                      className={cn(
                        "rounded-xl border-2 p-3 sm:p-4 text-left text-xs sm:text-sm font-medium transition-all min-h-[44px] touch-manipulation",
                        selectedGoal === i ? "border-primary bg-accent" : "border-border bg-background hover:border-primary/30 active:border-primary/50"
                      )}
                    >{g}</button>
                  ))}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">Какой бюджет?</p>
                <div className="flex flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6">
                  {budgets.map((b, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedBudget(i)}
                      className={cn(
                        "rounded-full border-2 px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all min-h-[44px] touch-manipulation",
                        selectedBudget === i ? "border-primary bg-accent" : "border-border bg-background hover:border-primary/30 active:border-primary/50"
                      )}
                    >{b}</button>
                  ))}
                </div>
              </>
            )}

            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <button
                disabled={step === 0}
                onClick={() => setStep(s => s - 1)}
                className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-full border border-border text-xs sm:text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-background transition-colors min-h-[44px] touch-manipulation"
              >Назад</button>
              <div className="flex gap-1.5 sm:gap-2">
                {[0, 1, 2].map(i => (
                  <div key={i} className={cn("w-6 sm:w-8 h-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-border")} />
                ))}
              </div>
              <button
                disabled={!canNext}
                onClick={() => step < 2 ? setStep(s => s + 1) : null}
                className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-full bg-primary text-primary-foreground text-xs sm:text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
              >{step === 2 ? 'Подобрать' : 'Следующий'}</button>
            </div>
          </div>

          {/* Right Banner */}
          <div className="hidden lg:flex lg:w-[320px] bg-primary rounded-2xl p-6 lg:p-8 flex-col items-center justify-center text-primary-foreground text-center min-h-[300px]">
            <h3 className="text-2xl lg:text-3xl font-bold mb-4">Подберем<br />за 5 минут</h3>
            <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-primary-foreground/20 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 lg:w-8 lg:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default QuizSection;
