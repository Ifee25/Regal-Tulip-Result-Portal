import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const highlights = [
  { number: "01", title: "Secure access", text: "Protected accounts keep school records available only to the people authorised to view them." },
  { number: "02", title: "Clear reporting", text: "Carefully structured nursery and primary report sheets present each pupil’s progress with clarity." },
  { number: "03", title: "Reliable records", text: "Term results remain organised by pupil, class and academic session for dependable school reporting." },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f7f9fc] text-slate-950">
      <Header />
      <main className="flex-1">
        <section className="relative isolate overflow-hidden border-b border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#eef6ff_48%,#f8fafc_100%)]">
          <div className="absolute -left-28 top-24 -z-10 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl" />
          <div className="absolute -right-24 -top-24 -z-10 h-96 w-96 rounded-full bg-blue-800/10 blur-3xl" />
          <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.2fr_.8fr] lg:items-center lg:px-8 lg:py-24">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-900/10 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-blue-950 shadow-sm backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-amber-500" />Regal Tulip School · Nkwelle
              </div>
              <h1 className="mt-7 text-4xl font-black leading-[1.08] tracking-[-0.035em] text-blue-950 sm:text-5xl lg:text-6xl">
                Every child’s progress,<span className="block text-sky-600">presented with purpose.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">A secure and dependable result portal created to help our school community manage, review and access pupil reports with confidence.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link href="/guardian" className="inline-flex min-h-12 items-center justify-center rounded-full bg-blue-950 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-blue-950/20 transition hover:-translate-y-0.5 hover:bg-blue-900">Open Guardian Portal <span aria-hidden="true" className="ml-2">→</span></Link>
                <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-full border border-blue-950/20 bg-white px-7 py-3 text-sm font-bold text-blue-950 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-950/40 hover:bg-slate-50">Staff &amp; Admin Sign In</Link>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:ml-auto">
              <div className="absolute -inset-4 rounded-[2.25rem] bg-gradient-to-br from-sky-400/20 via-blue-900/5 to-amber-400/20 blur-2xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 p-7 shadow-[0_28px_80px_-30px_rgba(15,23,42,.35)] backdrop-blur sm:p-9">
                <div className="absolute right-0 top-0 h-36 w-36 rounded-bl-full bg-blue-950/[0.035]" />
                <Image src="/school-logo-transparent.png" alt="Regal Tulip School crest" width={132} height={132} className="relative h-auto w-28 object-contain sm:w-32" priority />
                <p className="mt-7 text-xs font-bold uppercase tracking-[0.28em] text-sky-600">Knowledge · Character · Excellence</p>
                <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-blue-950">Building strong foundations for a brighter future.</h2>
                <div className="mt-7 h-px bg-gradient-to-r from-amber-400 via-sky-400 to-transparent" />
                <p className="mt-5 text-sm leading-7 text-slate-600">Thoughtful education, meaningful assessment and a lasting commitment to every learner.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-sky-600">Designed for our school community</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-blue-950 sm:text-4xl">Simple to use. Serious about every record.</h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {highlights.map((item) => (
                <article key={item.number} className="group rounded-3xl border border-slate-200 bg-[#fbfcfe] p-6 transition hover:-translate-y-1 hover:border-sky-200 hover:bg-white hover:shadow-xl hover:shadow-slate-200/60 sm:p-7">
                  <div className="flex items-center justify-between"><span className="text-sm font-black text-amber-500">{item.number}</span><span className="h-2 w-2 rounded-full bg-sky-500 transition group-hover:scale-150" /></div>
                  <h3 className="mt-8 text-xl font-black text-blue-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
