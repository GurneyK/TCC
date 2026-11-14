import { useId } from "react";
import { useSearchParams } from "react-router-dom";
import type { ForecastScenario } from "@/agents/cashForecast";
import { Callout } from "@/components/ui/feedback/Callout";
import { SegmentedControl } from "@/components/ui/segmented-control/SegmentedControl";
import { Select } from "@/components/ui/select/Select";
import { TREASURY_CENTRE_ID } from "@/data/world";
import { useTreasury } from "@/store/useTreasury";
import { shortEntity } from "../shared/format";
import { useDaySnapshot, useForecasts } from "../shared/metrics";
import { PageHeading } from "../shared/PageHeading";
import { ForecastCharts } from "./ForecastCharts";
import { FundingCard } from "./FundingCard";

export default function ForecastPage() {
  const [params, setParams] = useSearchParams();
  const entityId = params.get("entity") ?? "group";
  const scenario = (params.get("scenario") as ForecastScenario) || "base";
  const snapshot = useDaySnapshot();
  const { entities, group } = useForecasts(snapshot, scenario);
  const findings = useTreasury((s) => s.findings);
  const selectId = useId();
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next, { replace: true });
  };

  const forecast = entities.find((f) => f.entityId === entityId);
  const entity = snapshot.entities.find((e) => e.id === entityId);
  const breaches = entities.filter((f) => f.firstBreachWeek !== null && f.entityId !== TREASURY_CENTRE_ID);
  const funding = findings.filter((f) => f.agentId === "cash_forecast" && (entityId === "group" || f.id.startsWith(`cf-${entityId}-`)));

  return (
    <div className="space-y-6">
      <PageHeading
        actions={
          <>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700" htmlFor={selectId}>
                Entity
              </label>
              <div className="w-64">
                <Select id={selectId} onChange={(e) => update("entity", e.target.value)} value={entityId}>
                  <option value="group">Group total in USD</option>
                  {snapshot.entities.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.currency})
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <SegmentedControl
              label="Scenario"
              onChange={(v) => update("scenario", v)}
              segments={[
                { label: "Base", value: "base" },
                { label: "Stress", value: "stress" },
              ]}
              value={scenario}
            />
          </>
        }
        description="13 weeks per entity in local currency. Stress pushes receipts 10 days later and 15% lower."
        title={entity ? entity.name : "Group cash forecast"}
      />

      {scenario === "stress" ? (
        <Callout title="Stress case" tone="policy">
          Receipts arrive 10 days later and come in 15% lower. Use it to size buffers, not to fund entities.
        </Callout>
      ) : null}

      <div data-tour="funding" className="space-y-4">
        {funding.map((f) => (
          <FundingCard finding={f} key={f.id} />
        ))}
        {entityId === "group" && !funding.length && breaches.length === 0 ? (
          <Callout title="Every entity stays above its minimum">The base case has no breaches in the next 13 weeks.</Callout>
        ) : null}
        {entityId === "group" && breaches.length ? (
          <p className="text-sm text-gray-600">
            Under the {scenario} case, {breaches.map((b) => shortEntity(snapshot.entities.find((e) => e.id === b.entityId)?.name ?? b.entityId)).join(", ")} {breaches.length === 1 ? "drops" : "drop"} below minimum. Pick an entity for detail.
          </p>
        ) : null}
      </div>

      <ForecastCharts entity={entity} forecast={forecast} group={group} scenario={scenario} />
    </div>
  );
}
