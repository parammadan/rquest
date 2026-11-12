import { ButtonLink } from "@/components/ui/button";
import { LogoMark } from "@/features/brand/logo";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4">
      <div className="text-center">
        <LogoMark className="mx-auto h-12 w-12" />
        <p className="eyebrow mt-6">404 · Off the map</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">This route doesn’t exist</h1>
        <p className="mt-3 text-fg-muted">The mission or page you’re looking for isn’t part of the academy.</p>
        <div className="mt-8 flex justify-center gap-2">
          <ButtonLink href="/academy/map">Mission map</ButtonLink>
          <ButtonLink href="/" variant="secondary">Home</ButtonLink>
        </div>
      </div>
    </main>
  );
}
