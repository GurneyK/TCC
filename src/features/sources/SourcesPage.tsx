import { Alert } from "@/components/ui/alert/Alert";
import { DataSourceCard } from "@/components/ui/dashboard/DataSourceCard";
import type { DataSource } from "@/data/types";
import { formatDateTime, relativeTime } from "@/lib/dates";
import { useActor, useStaleSources, useUi } from "@/store/hooks";
import { useTreasury } from "@/store/useTreasury";
import { PageHeading } from "../shared/PageHeading";
import { CsvUpload } from "./CsvUpload";

const TYPE_LABEL: Record<DataSource["type"], string> = {
  bank_feed: "Bank feed",
  erp: "ERP",
  market_data: "Market data",
  watchlist: "Sanctions watchlist",
  file_upload: "Manual upload",
};

export default function SourcesPage() {
  const sources = useTreasury((s) => s.data.sources);
  const accounts = useTreasury((s) => s.data.accounts);
  const now = useTreasury((s) => s.now);
  const retry = useTreasury((s) => s.retrySync);
  const stale = useStaleSources();
  const actor = useActor();
  const notify = useUi((s) => s.notify);
  const openRecord = useUi((s) => s.openRecord);
  const delayed = sources.filter((s) => stale.has(s.id));

  return (
    <div className="space-y-6">
      <PageHeading
        description="Every feed the hub reads, with its service level. A feed that misses its window is marked delayed, and every number built from it carries a Stale badge."
        eyebrow="Data sources"
        title="Feeds and uploads"
      />

      {delayed.map((s) => (
        <Alert key={s.id} title={`${s.name} is delayed`} variant="warning">
          Last sync {relativeTime(s.lastSyncAt, now)} against a {Math.round(s.slaMinutes / 60)} hour window. {accounts.filter((a) => a.sourceId === s.id).length} accounts show their last known balance until it syncs.
        </Alert>
      ))}

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {sources.map((s) => {
          const isStale = stale.has(s.id);
          const fed = accounts.filter((a) => a.sourceId === s.id).length;
          return (
            <div data-tour={isStale ? "stale-source" : undefined} key={s.id}>
              <DataSourceCard
                description={`${TYPE_LABEL[s.type]} · ${s.format} · SLA ${s.slaMinutes >= 60 * 24 * 30 ? "none" : s.slaMinutes >= 60 ? `${Math.round(s.slaMinutes / 60)} hour${Math.round(s.slaMinutes / 60) === 1 ? "" : "s"}` : `${s.slaMinutes} minutes`}${fed ? ` · ${fed} accounts` : ""}`}
                documents={`${s.recordsToday.toLocaleString("en-US")} records`}
                showSync={actor.role !== "auditor" && s.type !== "file_upload"}
                onSync={
                  () => {
                        retry(s.id);
                        notify("Sync complete", `${s.name} is current again.`, "success");
                  }
                }
                onView={() => openRecord({ type: "source", id: s.id, label: s.name })}
                policyLabel="Last sync"
                policyValue={isStale ? `${relativeTime(s.lastSyncAt, now)}` : formatDateTime(s.lastSyncAt).replace(" UTC", "")}
                status={isStale ? "review" : "connected"}
                statusLabel={isStale ? "Delayed" : "Healthy"}
                syncLabel={isStale ? "Retry sync" : "Sync now"}
                title={s.name}
                viewLabel="Details"
                volumeLabel="Today"
              />
            </div>
          );
        })}
      </div>

      <CsvUpload />
    </div>
  );
}
