"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TrainingPlanBoard } from "@/components/training-plan/training-plan-board";
import { MemberCalendar } from "./member-calendar";

export function MemberScheduleTabsClient(memberCalendarProps: React.ComponentProps<typeof MemberCalendar>) {
  const [tab, setTab] = useState("available-classes");

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="available-classes">Available Classes</TabsTrigger>
        <TabsTrigger value="training-plan">Training Plan</TabsTrigger>
      </TabsList>
      <TabsContent value="available-classes">
        <MemberCalendar {...memberCalendarProps} />
      </TabsContent>
      <TabsContent value="training-plan">
        <TrainingPlanBoard canEdit={false} />
      </TabsContent>
    </Tabs>
  );
}
