import { Crown, Users, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import aboutMain from '@/assets/about-main.jpg';
import aboutMortgage from '@/assets/about-mortgage.jpg';
import aboutExperience from '@/assets/about-experience.jpg';

const stats = [
  { value: '12+ лет', label: 'опыта на рынке', icon: Crown },
  { value: '15+', label: 'сотрудников', icon: Users },
  { value: '5 тыс +', label: 'клиентов', icon: Heart },
];

const AboutPlatform = () => (
  <section className="py-12 bg-secondary">
    <div className="max-w-[1400px] mx-auto px-4">
      <h2 className="text-2xl font-bold mb-6">О платформе Live Grid</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* LEFT — image cards */}
        <div className="flex flex-col gap-4 order-2 lg:order-1">
          {/* Main card */}
          <div className="relative rounded-2xl overflow-hidden aspect-[16/10]">
            <img
              src={aboutMain}
              alt="Эксклюзивные объекты"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 p-5 text-white">
              <h3 className="text-lg font-bold mb-1">Эксклюзивные объекты</h3>
              <p className="text-sm leading-snug opacity-90 max-w-xs">
                Мы работаем с самыми редкими объектами недвижимости для клиентов с высокими бюджетами
              </p>
            </div>
          </div>

          {/* Two small cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="relative rounded-2xl overflow-hidden aspect-square">
              <img
                src={aboutMortgage}
                alt="Низкий процент"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 p-4 text-white">
                <h4 className="text-base font-bold mb-0.5">Низкий %</h4>
                <p className="text-xs leading-snug opacity-90">
                  Сделаем выгодный платеж по ипотеке под Ваш запрос
                </p>
              </div>
            </div>

            <div className="relative rounded-2xl overflow-hidden aspect-square">
              <img
                src={aboutExperience}
                alt="Большой опыт"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 p-4 text-white">
                <h4 className="text-base font-bold mb-0.5">Большой опыт</h4>
                <p className="text-xs leading-snug opacity-90">
                  Позволяет нам найти самые выгодные предложения
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — text + buttons + stats */}
        <div className="flex flex-col justify-between order-1 lg:order-2">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold mb-4">Платформа по недвижимости</h3>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-3 max-w-[520px]">
              <p>
                LiveGrid – современная платформа по недвижимости, созданная на базе агентства «Авангард».
              </p>
              <p>
                Мы сопровождаем сделки по всей России, работая с жилой и коммерческой недвижимостью любого уровня — от новостроек до инвестиционных объектов. Команда базируется в Белгороде и обеспечивает полный цикл сопровождения: подбор, переговоры, юридическая защита и закрытие сделки.
              </p>
              <p>
                LiveGrid — это экспертиза, прозрачность и уверенность в результате.
              </p>
            </div>

            <div className="flex gap-4 mt-6">
              <Button className="rounded-[10px] px-6">Зарегистрироваться</Button>
              <Button className="rounded-[10px] px-6">Помощь с подбором</Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mt-8">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-3 bg-background rounded-xl p-4">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                  <s.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-lg font-bold leading-tight">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default AboutPlatform;
