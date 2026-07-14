import Image from "next/image";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3 mb-5">
      <div className="flex items-center gap-2.5 min-w-0">
        <Image
          src="/icons/icon-192.png"
          alt=""
          width={34}
          height={34}
          className="shrink-0 lg:hidden"
          priority
        />
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink truncate">
            {title}
          </h1>
          {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
