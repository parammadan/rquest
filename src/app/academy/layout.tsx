import { AppShell } from "@/features/shell/app-shell";
import { ProgressProvider } from "@/features/progress/progress-provider";

export default function AcademyLayout({ children }: LayoutProps<"/academy">) {
  return (
    <ProgressProvider>
      <AppShell>{children}</AppShell>
    </ProgressProvider>
  );
}
