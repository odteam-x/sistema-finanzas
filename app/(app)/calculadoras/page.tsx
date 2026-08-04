import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { getPayoutContext } from "./payout-data";
import { PayoutCalculator } from "./PayoutCalculator";
import { GoalCalculator } from "./GoalCalculator";
import { LoanCalculator } from "./LoanCalculator";

export const metadata = { title: "Calculadoras · Cachin'" };

export default async function CalculadorasPage() {
  const ctx = await getPayoutContext();

  return (
    <>
      <PageHeader title="Calculadoras" subtitle="Calcula rápido, guarda si quieres" />

      {/* "Mi cobro" va primero y es la pestaña por defecto: las otras dos son
          herramientas para una decisión puntual, esta responde la pregunta que
          se hace cada quincena. */}
      <Tabs defaultValue="payout">
        <TabsList className="mb-4">
          <TabsTrigger value="payout">Mi cobro</TabsTrigger>
          <TabsTrigger value="goal">Meta de ahorro</TabsTrigger>
          <TabsTrigger value="loan">Préstamo</TabsTrigger>
        </TabsList>
        <TabsContent value="payout">
          <PayoutCalculator
            gross={ctx.gross}
            nextPay={ctx.nextPay}
            daysUntilNextPay={ctx.daysUntilNextPay}
            items={ctx.items}
            laterDebts={ctx.laterDebts}
          />
        </TabsContent>
        <TabsContent value="goal">
          <GoalCalculator periodDays={ctx.periodDays} />
        </TabsContent>
        <TabsContent value="loan">
          <LoanCalculator />
        </TabsContent>
      </Tabs>
    </>
  );
}
