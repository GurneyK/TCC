import { Table2, BarChart3 } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button/Button";
import { ChartContainer } from "@/components/ui/charts/ChartContainer";

export interface ChartCardProps {
  title: string;
  description?: string;
  chart: ReactNode;
  table: ReactNode;
  legend?: ReactNode;
  toolbar?: ReactNode;
}

/** Every chart ships with a real table view of the same data. */
export function ChartCard({ chart, description, legend, table, title, toolbar }: ChartCardProps) {
  const [asTable, setAsTable] = useState(false);
  const regionId = useId();
  return (
    <ChartContainer
      description={description}
      title={title}
      toolbar={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {toolbar}
          <Button
            aria-controls={regionId}
            aria-pressed={asTable}
            leadingIcon={asTable ? <BarChart3 aria-hidden="true" className="h-4 w-4" /> : <Table2 aria-hidden="true" className="h-4 w-4" />}
            onClick={() => setAsTable((v) => !v)}
            size="sm"
            variant="tertiaryGray"
          >
            {asTable ? "View as chart" : "View as table"}
          </Button>
        </div>
      }
    >
      <div id={regionId}>
        {asTable ? table : chart}
        {!asTable && legend ? <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">{legend}</div> : null}
      </div>
    </ChartContainer>
  );
}

export function LegendItem({ label, swatch }: { label: string; swatch: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className={["h-2.5 w-2.5 rounded-full", swatch].join(" ")} />
      {label}
    </span>
  );
}
