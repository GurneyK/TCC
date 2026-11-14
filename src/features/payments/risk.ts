export function riskTone(score: number): "error" | "warning" | "neutral" | "success" {
  return score >= 70 ? "error" : score >= 40 ? "warning" : score > 0 ? "neutral" : "success";
}
