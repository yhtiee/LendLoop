import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRightIcon,
  BellRingIcon,
  CalendarRangeIcon,
  PackagePlusIcon,
  ShieldCheckIcon,
  UndoIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { HeaderAuth } from "@/components/marketing/header-auth";
import { PublicToolList } from "@/components/marketing/public-tool-list";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const steps = [
  {
    icon: PackagePlusIcon,
    title: "List what you own",
    body: "Add a tool in seconds: name, category, condition. You stay in control of who borrows it.",
  },
  {
    icon: CalendarRangeIcon,
    title: "Request a date range",
    body: "Pick the days you need it. The owner approves or declines with one click.",
  },
  {
    icon: UndoIcon,
    title: "Return and repeat",
    body: "Mark it returned when it's back. Your lending history builds trust in the neighbourhood.",
  },
];

const assurances = [
  {
    icon: BellRingIcon,
    title: "Reminders, handled",
    body: "Owners hear about new requests instantly. Borrowers get a nudge when something is overdue.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Private by default",
    body: "Visitors only see a tool's name and category. Contact details stay between the two neighbours.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <HeaderAuth />
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b">
          <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
          <div className="relative mx-auto grid max-w-5xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.1fr_1fr] md:items-center md:py-24">
            <div className="flex flex-col items-start gap-6">
              <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
                <span className="size-1.5 rounded-full bg-success" />
                A tool library for your street
              </span>
              <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                Borrow the drill.
                <br />
                <span className="text-primary">Skip the hardware store.</span>
              </h1>
              <p className="max-w-md text-base text-pretty text-muted-foreground sm:text-lg">
                Neighbours list the tools they&apos;re happy to lend. You
                request what you need, for the days you need it. Reminders take
                care of the rest.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild size="lg" className="px-4">
                  <Link href="/sign-in">
                    Sign in to lend or borrow
                    <ArrowRightIcon data-icon="inline-end" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="px-4">
                  <Link href="#how-it-works">How it works</Link>
                </Button>
              </div>
            </div>

            {/* Reads today's date + live data, so it streams in after the static shell */}
            <Suspense fallback={<Skeleton className="h-80 rounded-xl" />}>
              <PublicToolList />
            </Suspense>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-14 border-b">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-20">
            <div className="mb-10 max-w-lg">
              <h2 className="text-2xl font-semibold tracking-tight">
                Three steps. No spreadsheets.
              </h2>
              <p className="mt-2 text-muted-foreground">
                Everything a shared shed needs, and nothing it doesn&apos;t.
              </p>
            </div>
            <ol className="grid gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-3">
              {steps.map((step, i) => (
                <li key={step.title} className="flex flex-col gap-3 bg-card p-6">
                  <div className="flex items-center justify-between">
                    <step.icon className="size-5 text-primary" />
                    <span className="font-mono text-xs text-muted-foreground">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Assurances */}
        <section>
          <div className="mx-auto grid max-w-5xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-20">
            {assurances.map((item) => (
              <div key={item.title} className="flex gap-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <item.icon className="size-4" />
                </div>
                <div>
                  <h3 className="font-medium">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 text-xs text-muted-foreground sm:px-6">
          <span>LendLoop</span>
          <span>Built for neighbours</span>
        </div>
      </footer>
    </div>
  );
}
