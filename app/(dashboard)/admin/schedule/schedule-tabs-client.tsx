"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TrainingPlanBoard } from "@/components/training-plan/training-plan-board";
import { ScheduleClient } from "./schedule-client";

export function ScheduleTabsClient({
  canEditTrainingPlan,
  ...scheduleProps
}: { canEditTrainingPlan: boolean } & React.ComponentProps<typeof ScheduleClient>) {
  const [tab, setTab] = useState("class-schedule");

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="class-schedule">Class Schedule</TabsTrigger>
        <TabsTrigger value="training-plan">Training Plan</TabsTrigger>
      </TabsList>
      <TabsContent value="class-schedule">
        <ScheduleClient {...scheduleProps} />
      </TabsContent>
      <TabsContent value="training-plan">
        <TrainingPlanBoard canEdit={canEditTrainingPlan} />
      </TabsContent>
    </Tabs>
  );
}
