import { Download, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert } from "@/components/ui/alert/Alert";
import { Badge } from "@/components/ui/badge/Badge";
import { Button } from "@/components/ui/button/Button";
import { ResultState } from "@/components/ui/feedback/ResultState";
import { FileUpload } from "@/components/ui/forms/FileUpload";
import { Table } from "@/components/ui/table/Table";
import { parseStatement, STATEMENT_COLUMNS, type ParsedStatement } from "@/lib/csv";
import { formatWithCode } from "@/lib/money";
import { useActor } from "@/store/hooks";
import type { ImportSummary } from "@/store/state";
import { useTreasury } from "@/store/useTreasury";

const SAMPLE = `${import.meta.env.BASE_URL}samples/crestwood-statement.csv`;

/** Validate, preview, confirm, import, reconcile. All on the client. */
export function CsvUpload() {
  const accounts = useTreasury((s) => s.data.accounts);
  const importStatement = useTreasury((s) => s.importStatement);
  const actor = useActor();
  const navigate = useNavigate();
  const [file, setFile] = useState<{ name: string; parsed: ParsedStatement } | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [loadError, setLoadError] = useState("");

  const load = (name: string, text: string) => {
    setSummary(null);
    setLoadError("");
    setFile({ name, parsed: parseStatement(text, accounts) });
  };

  const loadSample = async () => {
    try {
      const res = await fetch(SAMPLE);
      if (!res.ok) throw new Error(String(res.status));
      load("crestwood-statement.csv", await res.text());
    } catch {
      setLoadError("Couldn't load the sample file. Download it and upload it instead.");
    }
  };

  const bad = file?.parsed.rows.filter((r) => r.errors.length).length ?? 0;
  const good = (file?.parsed.rows.length ?? 0) - bad;

  return (
    <section aria-labelledby="upload-title" className="space-y-4 rounded-h3lLg border border-gray-200 bg-white p-5 shadow-h3lXs" data-tour="csv-upload">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900" id="upload-title">
            Upload a bank statement
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
            When a feed is down, load the statement by hand. Columns: <span className="font-mono text-xs">{STATEMENT_COLUMNS.join(", ")}</span>. The file is parsed in your browser and never leaves it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="focus-ring inline-flex h-9 items-center gap-2 rounded-h3lMd px-3.5 text-sm font-semibold text-gray-600 hover:bg-gray-50" download href={SAMPLE}>
            <Download aria-hidden="true" className="h-4 w-4" />
            Download sample
          </a>
          {actor.role !== "auditor" ? (
            <Button leadingIcon={<FileSpreadsheet aria-hidden="true" className="h-4 w-4" />} onClick={loadSample} size="sm" variant="secondaryColor">
              Use the Crestwood sample
            </Button>
          ) : null}
        </div>
      </div>

      {actor.role === "auditor" ? (
        <p className="text-sm text-gray-600">Read only. Analysts and treasurers can import statements.</p>
      ) : (
        <FileUpload accept=".csv,text/csv" description="CSV up to 1 MB" label="Choose a CSV statement" onFile={async (f) => load(f.name, await f.text())} />
      )}

      {loadError ? <Alert variant="error">{loadError}</Alert> : null}
      {file?.parsed.headerError ? (
        <Alert title={`Can't read ${file.name}`} variant="error">
          {file.parsed.headerError}
        </Alert>
      ) : null}

      {file && !file.parsed.headerError && !summary ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">{file.name}</span>: {good} rows ready{bad ? `, ${bad} with errors that will be skipped` : ""}.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => setFile(null)} size="sm" variant="secondaryGray">
                Cancel
              </Button>
              <Button disabled={!good} onClick={() => setSummary(importStatement(file.parsed.rows, file.name))} size="sm">
                Import {good} rows and reconcile
              </Button>
            </div>
          </div>
          <Table
            caption={`Preview of ${file.name}`}
            columns={[
              { key: "line", header: "Line" },
              { key: "valueDate", header: "Value date" },
              { key: "counterparty", header: "Counterparty" },
              { key: "reference", header: "Reference" },
              { key: "amount", header: "Amount", align: "right", render: (r) => (r.errors.length ? "" : `${r.direction === "out" ? "−" : ""}${formatWithCode({ minor: r.amountMinor, currency: r.currency })}`) },
              { key: "check", header: "Check", render: (r) => (r.errors.length ? <span className="text-sm text-error-700">{r.errors.join(". ")}</span> : <Badge variant="success">Valid</Badge>) },
            ]}
            getRowKey={(r) => String(r.line)}
            rows={file.parsed.rows}
          />
        </div>
      ) : null}

      {summary ? (
        <ResultState
          actions={
            <>
              <Button onClick={() => navigate("/exceptions?agent=reconciliation")} size="sm">
                Review in Exceptions
              </Button>
              <Button
                onClick={() => {
                  setSummary(null);
                  setFile(null);
                }}
                size="sm"
                variant="secondaryGray"
              >
                Upload another
              </Button>
            </>
          }
          description={`${summary.matched} matched to open invoices, ${summary.fees} bank fees grouped, ${summary.exceptions} left as exceptions${summary.unmatched > 0 ? `, ${summary.unmatched} waiting` : ""}. The Reconciliation agent raised findings for you to confirm.`}
          title={`Imported ${summary.imported} bank lines`}
          tone={summary.exceptions ? "warning" : "success"}
        />
      ) : null}
    </section>
  );
}
