import { loadMockup } from "../../lib/mockup";

export const dynamic = "force-static";

export default function DashboardBPage() {
  return (
    <div dangerouslySetInnerHTML={{ __html: loadMockup("dashboard-b.html") }} />
  );
}
