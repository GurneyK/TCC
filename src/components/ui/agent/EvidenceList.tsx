import { FileText, ShieldCheck } from "lucide-react";
import { Badge } from "../badge/Badge";
import { CitationChip } from "./CitationChip";

export interface EvidenceItem {
  confidence?: string;
  label: string;
  meta: string;
  tone?: "success" | "brand" | "neutral";
  onOpen?: () => void;
  openLabel?: string;
}

export interface EvidenceListProps {
  items?: EvidenceItem[];
  title?: string;
}

const defaultEvidence: EvidenceItem[] = [
  { confidence: "96%", label: "Regional lift summary", meta: "Analytics run", tone: "success" },
  { confidence: "88%", label: "Campaign evidence folder", meta: "Source pack", tone: "brand" },
  { confidence: "72%", label: "Budget recommendation", meta: "Agent note", tone: "neutral" },
];

export function EvidenceList({ items = defaultEvidence, title = "Evidence" }: EvidenceListProps) {
  return (
    <section className="rounded-habibiLg border border-gray-200 bg-white shadow-habibiXs">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <ShieldCheck aria-hidden="true" className="h-4 w-4 text-brand-700" />
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        </div>
        <Badge variant="success">{items.length} cited</Badge>
      </div>
      <div className="space-y-3 p-4">
        {items.map((item, index) => (
          <article className="rounded-habibiMd border border-gray-200 bg-white p-3" key={`${item.label}-${index}`}>
            <div className="flex items-start gap-3">
              <div className="rounded-habibiSm bg-brand-50 p-1.5 text-brand-700">
                <FileText aria-hidden="true" className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-gray-900">{item.label}</h4>
                <p className="mt-1 text-xs text-gray-500">
                  {item.meta}
                  {item.confidence ? ` · confidence ${item.confidence}` : ""}
                </p>
                <div className="mt-3">
                  <CitationChip
                    confidence={item.confidence}
                    index={index + 1}
                    label={item.openLabel ?? (item.onOpen ? "Open record" : "Open citation")}
                    onClick={item.onOpen}
                    tone={item.tone ?? "brand"}
                  />
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
