import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, BadgeDollarSign, Wrench, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

interface ActiveDeal {
  promotion_id: string;
  title:        string;
  brand_name:   string | null;
  description:  string | null;
  image_url:    string | null;
  cta_url:      string | null;
  start_date:   string;
  end_date:     string;
  display_order: number;
}

function formatDateRange(start: string, end: string): string {
  const parse = (d: string) => new Date(d + "T00:00:00");
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const endOpts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  return `${parse(start).toLocaleDateString("en-US", opts)} – ${parse(end).toLocaleDateString("en-US", endOpts)}`;
}

export default async function PromotionsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_active_deals");
  const promotions: ActiveDeal[] = (!error && data) ? (data as ActiveDeal[]) : [];

  return (
    <div className="min-h-screen bg-white -mt-[104px]">
      {/* Hero Section */}
      <section className="relative w-full h-[500px] md:h-[600px] flex items-center justify-center overflow-hidden pt-[104px]">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1580273916550-e323be2ae537?q=80&w=1920&auto=format&fit=crop"
            alt="Promotions and Deals Banner"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto space-y-6">
          <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight">
            Exclusive <span className="text-primary">Deals & Promotions</span>
          </h1>
          <p className="text-lg md:text-xl text-zinc-300">
            Upgrade your ride with premium tyres and unbeatable offers. 
            Limited time only, get cash back and exclusive discounts directly from top manufacturers.
          </p>
        </div>
      </section>

      {/* Promotions Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 space-y-6 md:space-y-0">
            <div>
              <p className="text-primary font-bold text-sm tracking-[0.2em] uppercase mb-2">
                Limited Time
              </p>
              <h2 className="text-4xl md:text-5xl font-black text-zinc-900 mb-3 tracking-tight">
                Deals & Offers
              </h2>
              <p className="text-zinc-500 text-lg">
                Get cash back directly from the manufacturer!
              </p>
            </div>
            
            {/* Nav Arrows */}
            <div className="flex items-center gap-3">
              <button 
                type="button" 
                aria-label="Previous offers"
                className="w-12 h-12 flex items-center justify-center rounded-full border border-primary text-primary hover:bg-primary/10 transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button 
                type="button" 
                aria-label="Next offers"
                className="w-12 h-12 flex items-center justify-center rounded-full bg-primary text-zinc-900 hover:bg-primary/90 transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Cards Grid / Carousel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {promotions.map((promo) => {
              const brandInitials = promo.brand_name
                ? promo.brand_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
                : "—";

              return (
                <div 
                  key={promo.promotion_id} 
                  className="group relative h-[420px] rounded-2xl overflow-hidden cursor-pointer"
                >
                  {/* Background Image */}
                  {promo.image_url ? (
                    <Image
                      src={promo.image_url}
                      alt={promo.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black flex items-center justify-center">
                      <span className="font-oswald text-5xl font-black text-white/20">{brandInitials}</span>
                    </div>
                  )}
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90" />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300" />

                  {/* Content */}
                  <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
                    {/* Brand Tag */}
                    <div>
                      {promo.brand_name && (
                        <span className="inline-block bg-white text-zinc-900 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
                          {promo.brand_name}
                        </span>
                      )}
                    </div>

                    {/* Bottom Text */}
                    <div className="space-y-3 transform translate-y-4 transition-transform duration-300 group-hover:translate-y-0">
                      {promo.description && (
                        <p className="text-zinc-200 text-sm font-medium">
                          {promo.description}
                        </p>
                      )}
                      <h3 className="text-white text-3xl font-bold leading-tight">
                        {promo.title}
                      </h3>
                      <div className="flex flex-col space-y-1 mt-2">
                        <p className="text-zinc-400 text-xs font-medium">
                          {formatDateRange(promo.start_date, promo.end_date)}
                        </p>
                        {promo.cta_url && (
                          <Link 
                            href={promo.cta_url} 
                            className="inline-flex items-center text-primary text-sm font-bold mt-3 group-hover:underline"
                          >
                            View Deal <span className="ml-1">→</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* Additional Features / Info Section */}
      <section className="bg-white py-24 relative overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-zinc-900 mb-6 tracking-tight">Why Buy From Us?</h2>
            <p className="text-zinc-500 max-w-2xl mx-auto text-lg">
              We provide the best prices directly from manufacturers along with expert fitment services across the country.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: BadgeDollarSign, title: "Direct Manufacturer Deals", desc: "No middlemen. Get the best possible prices and cashbacks directly." },
              { icon: Wrench, title: "Expert Installation", desc: "Choose from our network of certified fitters for seamless installation." },
              { icon: ShieldCheck, title: "Nationwide Warranty", desc: "All our tyres come with standard manufacturer warranty against defects." }
            ].map((feature, i) => (
              <div 
                key={i} 
                className="group relative bg-white p-10 rounded-[2.5rem] border border-zinc-100 hover:border-transparent hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-2 cursor-default text-left overflow-hidden"
              >
                {/* Decorative top border glow */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="w-16 h-16 bg-zinc-50 group-hover:bg-primary rounded-2xl flex items-center justify-center mb-8 transition-colors duration-500 group-hover:shadow-lg group-hover:shadow-primary/30 relative z-10">
                  <feature.icon className="w-8 h-8 text-zinc-400 group-hover:text-zinc-900 transition-colors duration-500" strokeWidth={2} />
                </div>
                
                <h3 className="text-2xl font-bold text-zinc-900 mb-4 relative z-10">{feature.title}</h3>
                <p className="text-zinc-500 leading-relaxed relative z-10">{feature.desc}</p>
                
                {/* Decorative background icon */}
                <feature.icon className="absolute -bottom-6 -right-6 w-48 h-48 text-zinc-50/80 group-hover:text-primary/[0.03] transition-colors duration-500 pointer-events-none transform group-hover:scale-110 group-hover:-rotate-12 transition-transform" strokeWidth={1} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
