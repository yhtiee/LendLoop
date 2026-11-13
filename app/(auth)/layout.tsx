import { Suspense } from "react";
import { CheckIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo, LogoMark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const points = [
  "Lend what's sitting in your shed",
  "Borrow for exactly the days you need",
  "Automatic reminders when something's due back",
];

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Brand panel: ink surface, shown from lg up */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-ink-900 p-10 text-ink-50 lg:flex">
        <div className="bg-grid absolute inset-0 opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="relative flex items-center gap-2 font-semibold tracking-tight">
          <LogoMark className="[&_rect]:fill-brand-500" />
          LendLoop
        </div>
        <div className="relative max-w-sm">
          <h2 className="text-2xl font-semibold tracking-tight text-balance">
            The neighbourhood tool shed, without the shed.
          </h2>
          <ul className="mt-6 space-y-3">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-3 text-sm text-ink-300">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-brand-300" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative font-mono text-xs text-ink-400">
          lend · borrow · return
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-col">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">
          <Logo className="lg:invisible" />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-14">
          {/* Clerk's forms read the URL at runtime, so they stream in after the static shell */}
          <Suspense fallback={<Skeleton className="h-[420px] w-full max-w-[400px] rounded-xl" />}>
            {children}
          </Suspense>
        </div>
      </main>
    </div>
  );
}
