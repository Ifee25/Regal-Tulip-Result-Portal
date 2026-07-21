import Link from "next/link";
import Image from "next/image";

export default function Header() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:gap-6 sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Image src="/school-logo-transparent.png" alt="logo" width={40} height={40} />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">Regal Tulip School</div>
            <div className="text-xs text-slate-500">Result Portal</div>
          </div>
        </div>

        <nav className="flex shrink-0 items-center gap-2 sm:gap-4">
          <Link href="/login" className="rounded-full bg-sky-500 px-3 py-2 text-sm font-medium text-white hover:bg-sky-600 sm:ml-2 sm:px-4">Sign in</Link>
        </nav>
      </div>
    </header>
  );
}
