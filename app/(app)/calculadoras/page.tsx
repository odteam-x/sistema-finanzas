import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Illustration } from "@/components/ui/Illustration";
import { GoalCalculator } from "./GoalCalculator";
import { LoanCalculator } from "./LoanCalculator";

export const metadata = { title: "Calculadoras · Bolsillo Seguro" };

export default function CalculadorasPage() {
  return (
    <>
      <PageHeader title="Calculadoras" subtitle="Estimaciones rápidas, sin guardar nada" />

      <div className="flex justify-center mb-4">
        <Illustration name="calculator" width={150} />
      </div>

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
