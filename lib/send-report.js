export async function submitReport(report, mode) {
  let response;
  try {
    response = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...report, mode }),
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new Error("ግንኙነቱ አልተሳካም። እንደገና ይሞክሩ።");
  }

  if (mode === "download") {
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "ፒዲኤፉ አልተዘጋጀም።");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-${report.date}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return "ፒዲኤፉ ተወርዷል።";
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "ሪፖርቱ አልተላከም።");
  return data.message || "ሪፖርቱ ተልኳል።";
}
