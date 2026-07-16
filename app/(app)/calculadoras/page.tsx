import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { GoalCalculator } from "./GoalCalculator";
import { LoanCalculator } from "./LoanCalculator";

export const metadata = { title: "Calculadoras · Cachin'" };

export default function CalculadorasPage() {
  return (
    <>
      <PageHeader title="Calculadoras" subtitle="Calcula rápido, guarda si quieres" />

      <Tabs defaultValue="goal">
        <TabsList className="mb-4">
          <TabsTrigger value="goal">Meta de ahorro</TabsTrigger>
          <TabsTrigger value="loan">Préstamo</TabsTrigger>
        </TabsList>
        <TabsContent value="goal">
          <GoalCalculator />
        </TabsContent>
        <TabsContent value="loan">
          <LoanCalculator />
        </TabsContent>
      </Tabs>
    </>
  );
}
