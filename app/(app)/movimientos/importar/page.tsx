import { getImportProfiles, getSavingsAccounts } from "@/lib/data";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ImportWizard } from "./ImportWizard";

export const metadata = { title: "Importar estado de cuenta · Cachin'" };

export default async function ImportarPage() {
  const [accounts, profiles] = await Promise.all([getSavingsAccounts(), getImportProfiles()]);

  return (
    <>
      <PageHeader title="Importar" subtitle="Estado de cuenta bancario (CSV)" />

      {accounts.length === 0 ? (
        <EmptyState
          icon="wallet"
          illustration="wallet"
          title="Primero crea una cuenta"
          message="El extracto se importa a una cuenta específica — crea una en Balance antes de importar."
          action={
            <a
              href="/balance"
              className="inline-flex items-center justify-center gap-2 rounded-pill font-semibold min-h-11 px-4 text-[1.05rem] bg-gradient-brand text-white shadow-sm hover:brightness-[0.97] active:brightness-95"
            >
              Ir a Balance
            </a>
          }
        />
      ) : (
        <ImportWizard accounts={accounts} profiles={profiles} />
      )}
    </>
  );
}
